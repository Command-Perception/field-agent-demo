# Maintenance Flow — E2E Test Spec

## Setup
- [ ] Reset database to clean state
- [ ] Seed mock emails (must include the maintenance schedule email)
- [ ] Start the application
- [ ] Open browser to `http://localhost:3999`

## Test: Inbox shows maintenance email
- [ ] Navigate to `http://localhost:3999`
- [ ] Verify inbox shows the maintenance email
- [ ] Verify subject contains "Scheduled Maintenance"
- [ ] Verify flow_hint badge shows "maintenance"

## Test: Clicking email launches Maintenance flow
- [ ] Click the maintenance email in the inbox
- [ ] Verify FlowChart renders with maintenance steps
- [ ] Verify Step View shows at least 6 steps
- [ ] Verify steps include: warranty check, parts check, scheduling, service execution

## Test: Warranty decision is visible
- [ ] Verify warranty check node appears
- [ ] Verify the AI decided correctly based on equipment data

## Test: Parts inventory decision
- [ ] Verify parts availability check node appears
- [ ] Verify the flow handles in-stock or backordered paths

## Test: Service outcome branch
- [ ] Verify the service_outcome decision node (success/issue_found)
- [ ] Verify both paths lead to valid next steps

## Test: Test Flows menu works
- [ ] Click "🔧 Maintenance" in the Test Flows menu (left panel, below inbox)
- [ ] Verify it launches/routes to the maintenance flow
- [ ] Verify FlowChart updates

## Cleanup
- [ ] Reset database to clean state
