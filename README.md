# rackt

## Push notifications setup

### How to set up
1. Run Supabase migrations (including the new `device_push_tokens` table + triggers).
2. Deploy the `push-notify` edge function from `supabase/functions/push-notify`.
3. Set Supabase secrets for the edge function:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (Optional) `EXPO_ACCESS_TOKEN` if you want authenticated Expo Push API requests.
4. Test with two users/devices:
   - User A sends a friend request to User B and confirms User B receives a push.
   - User A reports a match that requires confirmation and User B receives a push.

### Required edge function secrets
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_ACCESS_TOKEN` (optional; Expo Push API works without auth but is rate limited)
