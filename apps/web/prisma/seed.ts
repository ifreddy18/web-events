//////////////////////////////////////////////////////////
// ROOT SEED FILE
//////////////////////////////////////////////////////////

import { prisma } from "./utils/prisma";

import { seedSports } from "./seeds/sports.seed";
import { seedDisciplines } from "./seeds/disciplines.seed";
import { seedServiceProviderTypes } from "./seeds/service-provider-types.seed";
import { seedServiceProviders } from "./seeds/service-providers.seed";
import { seedOrganizers } from "./seeds/organizers.seed";
import { seedLocations } from "./seeds/locations.seed";
import { seedEventSeries } from "./seeds/event-series.seed";
import { seedEventEditions } from "./seeds/event-editions.seed";
import { seedCompetitions } from "./seeds/competitions.seed";
import { seedAthletes } from "./seeds/athletes.seed";
import { seedResults } from "./seeds/results.seed";
import { seedServiceProviderDisciplines } from "./seeds/service-provider-disciplines.seed";
import { seedEventServiceProviders } from "./seeds/event-service-providers.seed";
import { seedEventResources } from "./seeds/event-resources.seed";
import { seedMedia } from "./seeds/media.seed";
import { seedEventSeriesMedia } from "./seeds/event-series-media.seed";
import { seedEventEditionMedia } from "./seeds/event-edition-media.seed";
import { seedServiceProviderMedia } from "./seeds/service-provider-media.seed";
import { seedTags } from "./seeds/tags.seed";
import { seedServiceProviderTags } from "./seeds/service-provider-tags.seed";
import { seedEventSeriesTags } from "./seeds/event-series-tags.seed";

/// =====================================================
/// runSeed
/// =====================================================
/// Main database seed orchestrator.
///
/// IMPORTANT:
/// Seed order matters because some entities
/// depend on previously seeded data.
/// =====================================================

async function runSeedStep(name: string, callback: () => Promise<void>) {
  console.log(`\n🌱 ${name}`);
  await callback();
  console.log(`✅ ${name} completed`);
}

async function runSeed() {
  console.log("🚀 Starting database seed...");

  //////////////////////////////////////////////////////////
  // FOUNDATION DOMAIN
  //////////////////////////////////////////////////////////

  await runSeedStep("Sports", seedSports);

  await runSeedStep("Disciplines", seedDisciplines);

  //////////////////////////////////////////////////////////
  // Organizers
  //////////////////////////////////////////////////////////

  await runSeedStep("Organizers", seedOrganizers);

  //////////////////////////////////////////////////////////
  // Locations
  //////////////////////////////////////////////////////////

  await runSeedStep("Locations", seedLocations);

  //////////////////////////////////////////////////////////
  // Event series
  //////////////////////////////////////////////////////////

  await runSeedStep("EventSeries", seedEventSeries);

  //////////////////////////////////////////////////////////
  // Event Editions
  //////////////////////////////////////////////////////////

  await runSeedStep("EventEditions", seedEventEditions);

  //////////////////////////////////////////////////////////
  // Competitions
  //////////////////////////////////////////////////////////

  await runSeedStep("Competitions", seedCompetitions);

  //////////////////////////////////////////////////////////
  // Service provider ecosystem
  //////////////////////////////////////////////////////////

  await runSeedStep("ServiceProviderTypes", seedServiceProviderTypes);

  await runSeedStep("ServiceProviders", seedServiceProviders);

  await runSeedStep(
    "ServiceProviderDisciplines",
    seedServiceProviderDisciplines,
  );

  await runSeedStep("EventServiceProviders", seedEventServiceProviders);

  //////////////////////////////////////////////////////////
  // Event Resources
  //////////////////////////////////////////////////////////

  await runSeedStep("EventResources", seedEventResources);

  //////////////////////////////////////////////////////////
  // Athletes
  //////////////////////////////////////////////////////////

  await runSeedStep("Athletes", seedAthletes);

  //////////////////////////////////////////////////////////
  // Results
  //////////////////////////////////////////////////////////

  await runSeedStep("Results", seedResults);

  //////////////////////////////////////////////////////////
  // Media
  //////////////////////////////////////////////////////////

  await runSeedStep("Media", seedMedia);

  await runSeedStep("EventSeriesMedia", seedEventSeriesMedia);

  await runSeedStep("EventEditionMedia", seedEventEditionMedia);

  await runSeedStep("ServiceProviderMedia", seedServiceProviderMedia);

  //////////////////////////////////////////////////////////
  // Tags
  //////////////////////////////////////////////////////////

  await runSeedStep("Tags", seedTags);

  await runSeedStep("ServiceProviderTags", seedServiceProviderTags);

  await runSeedStep("EventSeriesTags", seedEventSeriesTags);

  console.log("🎉 Database seed completed.");
}

//////////////////////////////////////////////////////////
// RUN SEED
//////////////////////////////////////////////////////////

runSeed()
  .catch((error) => {
    console.error("❌ Seed failed.");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
