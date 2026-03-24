#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
ACTION=""
DB_PATH="./dev.db"
ALL_USERS=0
IDS=()
USERNAMES=()

print_help() {
  cat <<'EOF'
Manage Budget Tracker users/data from the command line.

Usage:
  scripts/manage-db.sh <command> [options]

Commands:
  list-users
      List all stored users.

  delete-users
      Delete one, several, or all users. This also deletes all of each user's
      associated data (income, spending categories, saving categories,
      transactions, recurring transactions) via cascade.

  clear-user-data
      Delete all budgeting data for one, several, or all users, but keep each
      user account.

Options:
  --id <user-id>             Target a user by ID. Repeat for multiple users.
  --username <username>      Target a user by username (case-insensitive).
                             Repeat for multiple users. Alphanumeric only.
  --all                      Target all users.
  --db <path>                SQLite database path (default: ./dev.db)
  --help                     Show this help text.

Examples:
  scripts/manage-db.sh list-users
  scripts/manage-db.sh delete-users --username alice
  scripts/manage-db.sh delete-users --id user-id-1 --id user-id-2
  scripts/manage-db.sh delete-users --all
  scripts/manage-db.sh clear-user-data --username alice --username bob
  scripts/manage-db.sh clear-user-data --all
EOF
}

if [[ $# -eq 0 ]]; then
  print_help
  exit 0
fi

ACTION="$1"
shift

case "$ACTION" in
  help|-h|--help)
    print_help
    exit 0
    ;;
  list-users|delete-users|clear-user-data)
    ;;
  *)
    echo "Unknown command: $ACTION" >&2
    echo "Run '$SCRIPT_NAME --help' for usage." >&2
    exit 1
    ;;
esac

while [[ $# -gt 0 ]]; do
  case "$1" in
    --id)
      if [[ $# -lt 2 ]]; then
        echo "--id requires a value." >&2
        exit 1
      fi
      IDS+=("$2")
      shift 2
      ;;
    --username)
      if [[ $# -lt 2 ]]; then
        echo "--username requires a value." >&2
        exit 1
      fi
      if [[ ! "$2" =~ ^[A-Za-z0-9]+$ ]]; then
        echo "Username must be alphanumeric only: '$2'" >&2
        exit 1
      fi
      USERNAMES+=("$2")
      shift 2
      ;;
    --all)
      ALL_USERS=1
      shift
      ;;
    --db)
      if [[ $# -lt 2 ]]; then
        echo "--db requires a value." >&2
        exit 1
      fi
      DB_PATH="$2"
      shift 2
      ;;
    --help|-h)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run '$SCRIPT_NAME --help' for usage." >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database file not found: $DB_PATH" >&2
  exit 1
fi

if [[ "$ACTION" == "list-users" ]]; then
  if [[ "$ALL_USERS" -eq 1 || "${#IDS[@]}" -gt 0 || "${#USERNAMES[@]}" -gt 0 ]]; then
    echo "list-users does not accept --all, --id, or --username." >&2
    exit 1
  fi
else
  if [[ "$ALL_USERS" -eq 1 && ( "${#IDS[@]}" -gt 0 || "${#USERNAMES[@]}" -gt 0 ) ]]; then
    echo "Use either --all or specific --id/--username targets, not both." >&2
    exit 1
  fi
  if [[ "$ALL_USERS" -ne 1 && "${#IDS[@]}" -eq 0 && "${#USERNAMES[@]}" -eq 0 ]]; then
    echo "Provide at least one target via --id/--username, or use --all." >&2
    exit 1
  fi
fi

if [[ "$ACTION" != "list-users" ]]; then
  if [[ "$ACTION" == "delete-users" ]]; then
    echo "This will permanently delete users (and all their data)."
  else
    echo "This will permanently delete budgeting data for the selected users."
  fi
  read -r -p "Continue? [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *)
      echo "Cancelled."
      exit 0
      ;;
  esac
fi

IDS_TEXT="$(printf '%s\n' "${IDS[@]:-}")"
USERNAMES_TEXT="$(printf '%s\n' "${USERNAMES[@]:-}")"

ACTION="$ACTION" \
DB_PATH="$DB_PATH" \
ALL_USERS="$ALL_USERS" \
IDS_TEXT="$IDS_TEXT" \
USERNAMES_TEXT="$USERNAMES_TEXT" \
node <<'NODE'
const Database = require("better-sqlite3");

const action = process.env.ACTION;
const dbPath = process.env.DB_PATH;
const allUsers = process.env.ALL_USERS === "1";
const ids = (process.env.IDS_TEXT || "")
  .split("\n")
  .map((v) => v.trim())
  .filter(Boolean);
const usernames = (process.env.USERNAMES_TEXT || "")
  .split("\n")
  .map((v) => v.trim())
  .filter(Boolean);

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const getAllUsers = db.prepare(
  "SELECT id, username, usernameKey, createdAt FROM User ORDER BY createdAt ASC",
);
const getUserById = db.prepare(
  "SELECT id, username, usernameKey, createdAt FROM User WHERE id = ?",
);
const getUserByUsernameKey = db.prepare(
  "SELECT id, username, usernameKey, createdAt FROM User WHERE usernameKey = ?",
);

const toUsernameKey = (value) => value.trim().toLowerCase();

const resolveTargets = () => {
  if (allUsers) return getAllUsers.all();

  const byId = ids.map((id) => {
    const user = getUserById.get(id);
    if (!user) {
      throw new Error(`User not found for --id: ${id}`);
    }
    return user;
  });

  const byUsername = usernames.map((username) => {
    const user = getUserByUsernameKey.get(toUsernameKey(username));
    if (!user) {
      throw new Error(`User not found for --username: ${username}`);
    }
    return user;
  });

  const deduped = new Map();
  for (const user of [...byId, ...byUsername]) {
    deduped.set(user.id, user);
  }
  return [...deduped.values()];
};

const printUsers = (users) => {
  if (users.length === 0) {
    console.log("No users found.");
    return;
  }

  for (const user of users) {
    console.log(`${user.id}\t${user.username}\t${user.createdAt}`);
  }
};

const clearUserDataTx = db.transaction((userIds) => {
  const idsIn = userIds.map(() => "?").join(",");
  const runDelete = (table) =>
    db.prepare(`DELETE FROM "${table}" WHERE userId IN (${idsIn})`).run(...userIds).changes;

  const deletedTransactions = runDelete("Transaction");
  const deletedRecurring = runDelete("RecurringTransaction");
  const deletedSpending = runDelete("SpendingCategory");
  const deletedSaving = runDelete("SavingCategory");
  const deletedIncome = runDelete("IncomeSource");

  return {
    deletedTransactions,
    deletedRecurring,
    deletedSpending,
    deletedSaving,
    deletedIncome,
  };
});

try {
  if (action === "list-users") {
    const users = getAllUsers.all();
    printUsers(users);
    process.exit(0);
  }

  const targets = resolveTargets();
  if (targets.length === 0) {
    console.log("No matching users found.");
    process.exit(0);
  }

  const targetIds = targets.map((u) => u.id);

  if (action === "delete-users") {
    const deleteUsersTx = db.transaction((userIds) => {
      const idsIn = userIds.map(() => "?").join(",");
      const deleted = db
        .prepare(`DELETE FROM "User" WHERE id IN (${idsIn})`)
        .run(...userIds).changes;
      return deleted;
    });

    const deletedCount = deleteUsersTx(targetIds);
    console.log(`Deleted users: ${deletedCount}`);
    process.exit(0);
  }

  if (action === "clear-user-data") {
    const results = clearUserDataTx(targetIds);
    console.log(`Cleared data for users: ${targetIds.length}`);
    console.log(`Transactions deleted: ${results.deletedTransactions}`);
    console.log(`Recurring transactions deleted: ${results.deletedRecurring}`);
    console.log(`Spending categories deleted: ${results.deletedSpending}`);
    console.log(`Saving categories deleted: ${results.deletedSaving}`);
    console.log(`Income sources deleted: ${results.deletedIncome}`);
    process.exit(0);
  }

  throw new Error(`Unsupported action: ${action}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
} finally {
  db.close();
}
NODE
