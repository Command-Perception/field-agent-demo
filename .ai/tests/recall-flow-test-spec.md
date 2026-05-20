# Recall Flow — E2E Test Spec

## Setup
- [ ] Reset database to clean state
- [ ] Seed mock emails (must include the recall notice email)
- [ ] Start the application
- [ ] Open browser to `http://localhost:3999`

## Test: Inbox shows recall email
- [ ] Navigate to `http://localhost:3999`
- [ ] Verify inbox shows the recall email
- [ ] Verify subject contains "Recall Notice"
- [ ] Verify flow_hint badge shows "recall"

## Test: Clicking email launches Recall flow
- [ ] Click the recall email in the inbox
- [ ] Verify FlowChart renders with recall steps
- [ ] Verify Step View shows at least 8 steps
- [ ] Verify steps include: severity assessment, scope decision, parts order, schedule, precondition wait, execution

## Test: Severity decision
- [ ] Verify severity assessment node appears
- [ ] Verify it shows "critical" or "standard" based on email content

## Test: Parts ordering
- [ ] Verify order_parts tool call is recorded
- [ ] Verify PO number is generated in the tool data

## Test: Precondition wait
- [ ] Verify the "parts_arrived" precondition node is in the flowchart
- [ ] Verify it shows "waiting" state initially
- [ ] Verify retry attempts are visible

## Test: Recall execution outcome
- [ ] Verify the recall execution decision node (success/failed)
- [ ] Verify the customer_notification decision appears after success

## Test: User switcher shows all roles
- [ ] Verify the user switcher in the top nav shows 3 roles
- [ ] Switch to "Jane Smith (Maintenance)" — verify dropdown changes
- [ ] Switch to "Admin" — verify dropdown changes

## Test: Reset/reseed button works
- [ ] Verify a reset button exists in the UI
- [ ] Click the reset button
- [ ] Verify inbox reloads with fresh mock emails
- [ ] Verify FlowChart clears

## Cleanup
- [ ] Reset database to clean state
