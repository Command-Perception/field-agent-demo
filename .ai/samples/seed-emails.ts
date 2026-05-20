import { query } from "../../src/data/db"

const emails = [
  {
    from_address: "Dr. Smith <smith@acmedental.com>",
    subject: "Lunch Meeting — Thank You",
    body: "Thanks for the great lunch today! Let's move forward with the imaging software proposal. Had the salmon — excellent recommendation. Receipt attached.",
    flow_hint: "sales_visit",
  },
  {
    from_address: "noreply@equipment-monitor.local",
    subject: "Scheduled Maintenance — X100 Imaging Unit",
    body: "Routine 6-month maintenance is due for X100 Imaging Unit at Acme Dental (serial #X100-4421). Please schedule within 14 days. Estimated service time: 2 hours.",
    flow_hint: "maintenance",
  },
  {
    from_address: "recalls@dental-mfg.example.com",
    subject: "URGENT: Recall Notice — X100 Bracket Assembly",
    body: "Safety recall for X100 bracket assembly (lot #B4-2024). Affected units: 3 at Acme Dental. Required action: Replace bracket assembly on all affected units. Parts will be shipped within 48 hours upon ordering.",
    flow_hint: "recall",
  },
]

export async function seedEmails() {
  const existing = await query("SELECT COUNT(*) as c FROM mock_emails")
  if (parseInt(existing[0]?.c || "0", 10) > 0) {
    console.log("mock_emails table already has data. Skipping email seed.")
    return
  }
  for (const email of emails) {
    await query(
      `INSERT INTO mock_emails (from_address, subject, body, flow_hint) VALUES ($1, $2, $3, $4)`,
      [email.from_address, email.subject, email.body, email.flow_hint]
    )
    console.log(`  Seeded email: ${email.subject}`)
  }
  console.log("Email seeding complete.")
}
