import { query } from "./db"
import { seedEmails } from "../../.ai/samples/seed-emails"

async function seed() {
  const existing = await query("SELECT COUNT(*) as c FROM visits")
  const count = parseInt(existing[0]?.c || "0", 10)

  if (count > 0) {
    console.log(`Visits table already has ${count} rows. Skipping visit seed.`)
  } else {
    console.log("Seeding mock visits...")

    const visits = [
      {
        account_name: "Acme Dental Supply",
        account_industry: "dental",
        subject: "Q1 product demo and contract renewal discussion",
        notes: "Met with Dr. Smith. Interested in imaging software but concerned about pricing. Competitor MediTech offering discount. Wants proposal by next Friday. Spent $47 on coffee.",
        outcomes: "Positive - interested in upgrade path. Risk: competitor pricing pressure. Need to prepare competitive proposal by Friday.",
        owner_alias: "jdoe",
      },
      {
        account_name: "Greenfield HVAC",
        account_industry: "hvac",
        subject: "Seasonal maintenance contract review",
        notes: "Met with facility manager Johnson. Approved renewal but wants 5% discount for 3-year commit. All 12 units serviced. One compressor showing wear - needs replacement quote. Asked about smart thermostat integration.",
        outcomes: "Renewal approved pending 5% discount negotiation. Follow-up needed: compressor replacement quote. Opportunity: smart thermostat add-on.",
        owner_alias: "asmith",
      },
      {
        account_name: "CloudScale Software",
        account_industry: "software",
        subject: "Onboarding session for new ERP modules",
        notes: "3-hour session with CTO and engineering team. Modules implemented successfully. Found 2 data migration issues requiring vendor support tickets. Team wants follow-up training in 2 weeks. Expensed $120 for team lunch.",
        outcomes: "Successful onboarding completed. Two vendor support tickets to file. Follow-up training scheduled for 2 weeks out.",
        owner_alias: "jdoe",
      },
      {
        account_name: "NovaMed Research",
        account_industry: "medical",
        subject: "Quarterly business review",
        notes: "Mixed meeting. Purchasing director happy with overall service levels. Lab manager frustrated with recurring late deliveries. CFO requesting cost analysis for bulk reagent contract. Competitor BioSync offering volume pricing.",
        outcomes: "Service delivery issues identified for remediation. Cost analysis requested by CFO. Competitive threat from BioSync volume pricing needs response.",
        owner_alias: "bwilson",
      },
      {
        account_name: "Brickstone Consulting",
        account_industry: "consulting",
        subject: "Partnership expansion negotiation",
        notes: "Preliminary talks about expanding from 3 to 8 markets. CEO enthusiastic but wants phased rollout approach. Legal team needs to review IP sharing terms. Need sample SOW by end of month. Expensed $230 for client dinner.",
        outcomes: "Expansion interest confirmed. Legal review of IP terms pending. Sample SOW due end of month for phased approach.",
        owner_alias: "asmith",
      },
    ]

    const createdIds: string[] = []
    for (const v of visits) {
      const rows = await query(
        `INSERT INTO visits (account_name, account_industry, subject, notes, outcomes, owner_alias)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [v.account_name, v.account_industry, v.subject, v.notes, v.outcomes, v.owner_alias]
      )
      createdIds.push(rows[0].id)
      console.log(`  Created visit: ${v.account_name} (${rows[0].id})`)
    }

    console.log(`\nSeeded ${createdIds.length} visits.`)
    console.log("Visit IDs:", createdIds)
  }

  console.log("\nSeeding mock emails...")
  await seedEmails()
}

export { seed }

const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.includes("seed")
if (isMain) {
  seed().catch((err) => {
    console.error("Seed failed:", err)
    process.exit(1)
  })
}
