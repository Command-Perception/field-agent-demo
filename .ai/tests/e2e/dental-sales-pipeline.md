# Scenario: Dental Sales Pipeline Demo

**Theme:** Dental sales follow-up automation
**Viewport:** 1440x900
**Record:** true
**Max duration:** 180

## Steps

### 1. Open Dashboard
Open http://devbox.knet:4001 and verify the dashboard loads with visit cards visible.

### 2. Create a New Visit
Click "+ New Visit" to open the creation form. Fill in these details:

- **Account Name:** Prestige Dental Care
- **Industry:** dental
- **Subject:** Q2 equipment upgrade consultation
- **Notes:**
  Met with Dr. Martinez and office manager Sarah Chen. They're looking to upgrade their imaging suite — current Panorex unit is 8 years old and showing wear. Interested in our Genesis 3D cone-beam CT system. Dr. Martinez is concerned about the learning curve for staff. Competitor Sirona offered a demo. They want a trade-in quote for their old unit. Spent $60 on lunch at a deli near the office.
- **Outcomes:**
  Strong interest in Genesis 3D system. Trade-in needed for old Panorex. Staff training required. Need competitive comparison vs Sirona. Follow up with pricing by Friday.
- **Owner:** jdoe

Click "Create Visit" and wait for navigation to the visit detail page.

### 3. Verify Visit Context
Confirm the visit detail page shows:
- Account name "Prestige Dental Care"
- Industry "dental" badge
- The notes and outcomes text

### 4. Run the Agent
Click "Run Agent". The button should change to "Running..." (disabled).

### 5. Wait for Pipeline Completion
Watch the pipeline stepper progress through phases:
- Ingest ✓ → Extract ✓ → Plan ✓ → Act → Done
- Status badge should show "Waiting on Human" or "Completed"
- Check every 10 seconds, max 120 seconds

### 6. Review Analysis Artifact
Find and expand the "Visit analysis - Prestige Dental Care" artifact in the artifacts section.
Verify it contains the extraction result JSON from Claude.

### 7. Identify Pending HITL Tasks
Look for tasks with "Pending" state badge and Approve/Reject buttons visible.

### 8. Approve a Pending Task
Click the "Approve" button on a pending task.
In the HITL modal that appears:
- Fill in feedback: "Proceed with Genesis 3D quote, include trade-in estimate"
- Click the modal's "Approve" button
- Wait for the modal to close

### 9. Verify Follow-up Results
After approval, verify new artifacts appeared (research, task notes).

### 10. Take Final Screenshot
Take a full-page screenshot of the visit detail page showing all results.

## Verification Checklist

- [ ] Dashboard loaded with visit cards
- [ ] Visit created with correct account name
- [ ] Agent run completed
- [ ] Analysis artifact exists
- [ ] HITL modal approve flow worked
- [ ] New artifacts appeared after approval
- [ ] Screenshots captured
- [ ] Video recorded
