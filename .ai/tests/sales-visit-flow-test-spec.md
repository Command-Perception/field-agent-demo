# Sales Visit Flow — E2E Test Spec

## Setup
- [ ] Reset database to clean state
- [ ] Seed mock emails (must include the sales visit lunch email)
- [ ] Start the application (docker compose up or dev server)
- [ ] Open browser to `http://localhost:3999`

## Test: Inbox shows sales visit email
- [ ] Navigate to `http://localhost:3999`
- [ ] Verify the left panel shows inbox with the sales visit email
- [ ] Verify subject contains "Lunch Meeting"
- [ ] Verify flow_hint badge shows "sales_visit"

## Test: Clicking email launches Sales Visit flow
- [ ] Click the sales visit email in the inbox
- [ ] Verify the FlowChart renders in the center panel
- [ ] Verify the Step View populates in the right panel
- [ ] Verify at least 6 steps appear (receipt check → per diem decision → HITL or auto-approve → client type → submit → notify)

## Test: Flow decision points are visible
- [ ] Verify decision nodes appear in the flowchart (diamond shapes)
- [ ] Verify the receipt_check decision is present
- [ ] Verify the per_diem decision is present
- [ ] Verify the client_type decision is present

## Test: Step View shows expandable tool data
- [ ] Click on a step in the right panel
- [ ] Verify it expands to show tool input/output data in a monospace block
- [ ] Verify the data includes the tool name and result

## Test: Playback controls work
- [ ] Verify Prev/Next buttons are visible at the bottom of the center panel
- [ ] Click Next → verify the flowchart advances one step
- [ ] Click Prev → verify the flowchart goes back one step
- [ ] Verify arrow keys also navigate (→ advances, ← goes back)
- [ ] Verify the speed toggle (Fast/Normal/Slow) works

## Test: Debug overlay works
- [ ] Click the debug toggle button in the top nav
- [ ] Verify the debug panel slides open from the right
- [ ] Verify it shows all events in chronological order with type coloring
- [ ] Verify each event shows its label and type badge

## Cleanup
- [ ] Reset database to clean state
