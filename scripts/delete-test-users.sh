#!/usr/bin/env bash
# Delete the throwaway accounts created while verifying auth and RLS.
#
# Deleting users needs the Admin API, which only accepts the service_role
# key. That key bypasses RLS entirely, so it must never be committed,
# pasted into a chat, or hard-coded here — pass it in the environment and
# it stays on your machine:
#
#   SUPABASE_SERVICE_KEY='eyJ...' ./scripts/delete-test-users.sh
#
# Dry run by default. Add --yes to actually delete.
#
# Only touches addresses ending in @sqlacademy.dev, the domain used for
# every test account. Real accounts cannot match.

set -euo pipefail

PROJECT_URL="https://bdmjcqqpcwroekajjeeu.supabase.co"
DOMAIN="@sqlacademy.dev"
APPLY="${1:-}"

if [[ -z "${SUPABASE_SERVICE_KEY:-}" ]]; then
  echo "SUPABASE_SERVICE_KEY is not set." >&2
  echo "Run:  SUPABASE_SERVICE_KEY='...' $0 --yes" >&2
  exit 1
fi

echo "Fetching users from $PROJECT_URL ..."
USERS=$(curl -s "$PROJECT_URL/auth/v1/admin/users?per_page=200" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY")

MATCHES=$(printf '%s' "$USERS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
users = d.get('users', d if isinstance(d, list) else [])
for u in users:
    if (u.get('email') or '').endswith('$DOMAIN'):
        print(u['id'], u['email'])
")

if [[ -z "$MATCHES" ]]; then
  echo "No accounts ending in $DOMAIN. Nothing to do."
  exit 0
fi

COUNT=$(printf '%s\n' "$MATCHES" | wc -l | tr -d ' ')
echo
echo "$COUNT test account(s) matched:"
printf '%s\n' "$MATCHES" | sed 's/^/  /'
echo

if [[ "$APPLY" != "--yes" ]]; then
  echo "Dry run. Re-run with --yes to delete these."
  exit 0
fi

while read -r ID EMAIL; do
  [[ -z "$ID" ]] && continue
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
    "$PROJECT_URL/auth/v1/admin/users/$ID" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY")
  if [[ "$CODE" == "200" ]]; then echo "  deleted  $EMAIL"
  else                            echo "  FAILED   $EMAIL (http $CODE)"; fi
done < <(printf '%s\n' "$MATCHES")

echo
echo "Done. Their progress rows are gone too — progress.user_id cascades on delete."
