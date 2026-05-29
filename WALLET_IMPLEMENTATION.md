# Dynamic Wallet Balance Implementation

## Overview

This implementation adds dynamic balance fetching from the Supabase `wallets` table and integrates it with the dashboard and withdraw panel components.

## Database Schema

The `wallets` table stores user balance information:

```sql
wallets (
    id UUID PRIMARY KEY,
    user_id UUID (references auth.users),
    balance NUMERIC(12, 2),  -- USD amount
    currency TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

## Components

### 1. `useWalletBalance` Hook (`src/hooks/use-wallet-balance.tsx`)

A custom React hook that manages wallet balance state and operations.

**Features:**

- Fetches wallet balance for authenticated user
- Auto-creates wallet if it doesn't exist
- Real-time balance updates
- Error handling

**Usage:**

```tsx
const { balance, loading, error, refetch, updateBalance } = useWalletBalance();
```

**Returns:**

- `balance` (number | null): Current wallet balance
- `currency` (string): Currency code (default: USD)
- `loading` (boolean): Loading state
- `error` (string | null): Error message if any
- `refetch()`: Manually refresh balance
- `updateBalance(newBalance)`: Update balance in Supabase

### 2. Dashboard Component (`src/routes/dashboard.tsx`)

Updated to display dynamic balance instead of hardcoded value.

**Changes:**

- Imports `useWalletBalance` hook
- Displays loading state while fetching
- Shows error state if fetch fails
- Updates total net worth and vault balance dynamically

### 3. Withdraw Panel Component (`src/components/withdraw-panel.tsx`)

Updated to show current balance and update it after withdrawal.

**Changes:**

- Displays dynamic balance from hook
- Validates withdrawal amount against available balance
- Updates balance after successful withdrawal
- Shows loading state while fetching balance
- Includes error handling for insufficient funds

## Workflow

### Fetching Balance

1. User loads dashboard or withdraw panel
2. `useWalletBalance` hook fetches from `wallets` table
3. If wallet doesn't exist, it's created with 0 balance
4. Balance is displayed in UI

### Withdrawing Funds

1. User enters amount on withdraw panel
2. Amount is validated against current balance
3. User confirms withdrawal
4. System processes withdrawal (2.5s simulated delay)
5. Balance is updated in database: `new_balance = current_balance - amount - platform_fee`
6. UI updates to reflect new balance
7. Success message is shown with transaction ID

## Database Migrations

Two migration files are included:

### `002_create_wallets_table.sql`

- Creates the wallets table
- Sets up RLS (Row Level Security) policies
- Creates indexes for performance
- Sets up automatic `updated_at` timestamp

### `003_create_withdrawal_function.sql`

- Creates a Supabase RPC function for secure withdrawals
- Handles transaction-safe balance updates
- Validates sufficient balance before withdrawal
- Can be used instead of direct updates for better security

## Security Considerations

1. **RLS Policies**: Users can only access their own wallet
2. **Balance Validation**: Client-side and database-level validation
3. **Transactions**: RPC function ensures atomic updates
4. **Constraints**: Database constraint ensures balance >= 0

## Future Enhancements

1. Implement withdrawal transaction logging
2. Add balance history/audit trail
3. Implement recurring withdrawal limits
4. Add webhook notifications for large withdrawals
5. Implement multi-currency support
6. Add balance sync with payment processors
7. Implement refund logic for failed transactions

## Testing

### Manual Testing Steps

1. Create a user account
2. Navigate to dashboard - should show loading then $0.00 balance
3. Update balance via database directly or API
4. Refresh dashboard - should show updated balance
5. Go to withdraw panel - should display current balance
6. Attempt withdrawal greater than balance - should show error
7. Attempt valid withdrawal - should deduct and update balance
8. Check dashboard - balance should reflect the withdrawal

### API Testing

```bash
# Get current user
curl -X GET https://your-project.supabase.co/auth/v1/user \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check wallet balance (via Supabase)
curl -X GET "https://your-project.supabase.co/rest/v1/wallets?select=*" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Balance Not Loading

- Check user authentication status
- Verify Supabase URL and anon key in .env
- Check RLS policies on wallets table
- Check browser console for errors

### Withdrawal Not Updating Balance

- Verify `updateBalance` is being called
- Check database permissions
- Verify wallet exists for user
- Check for JavaScript errors

### Wallet Not Created Automatically

- Verify auth.users table has the user
- Check database constraints
- Check RLS policies allow inserts

## References

- [Supabase Docs](https://supabase.com/docs)
- [React Hooks](https://react.dev/reference/react)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
