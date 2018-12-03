const fetch = require("node-fetch");
const join = require("join-array");

const discordUrls = {
    YYGPC9: process.env.DISCORD_URL_NOR,
    L2YC2VY: process.env.DISCORD_URL_NOR2,
    "229GLQJV": process.env.DISCORD_URL_NOR3,
};
exports.handler = async (event, context, callback) => {
    if (event.Records && Array.isArray(event.Records)) {
        for (let record of event.Records) {
            if (record.eventName === "MODIFY") {
                const oldStatus = record.dynamodb.OldImage.warStatus.S;
                const newStatus = record.dynamodb.NewImage.warStatus.S;
                const clan = record.dynamodb.NewImage.clan.S;

                console.log(JSON.stringify(record.dynamodb.OldImage));
                console.log(JSON.stringify(record.dynamodb.NewImage));
                if (oldStatus === "warDay" && newStatus !== "warDay") {
                    //Finished war
                    const warTrophiesChange = record.dynamodb.NewImage.warTrophiesChange.N;
                    const skippedWarDayBattles = record.dynamodb.NewImage.skippedWarDayBattles
                        ? record.dynamodb.NewImage.skippedWarDayBattles.S
                        : null;
                    await sendDiscordMessage(
                        clan,
                        `Krigsdagen avsluttet og resultatet ble ${record.dynamodb.NewImage.place.N}. plass. Vi ${
                            warTrophiesChange < 0 ? "mistet" : "fikk"
                        } ${Math.abs(warTrophiesChange)} trofeer, og har nå ${
                            record.dynamodb.NewImage.warTrophies.N
                        } trofeer. ${
                            skippedWarDayBattles
                                ? skippedWarDayBattles + " tok ikke krigskampen."
                                : "Alle tok krigskampen sin"
                        }`
                    );
                } else if (oldStatus === "collectionDay" && newStatus !== "collectionDay") {
                    //Finished collectionDay
                    const skippedCollectionDayBattles = record.dynamodb.NewImage.skippedCollectionDayBattles
                        ? record.dynamodb.NewImage.skippedCollectionDayBattles.S
                        : null;
                    const participants = record.dynamodb.NewImage.warParticipants
                        ? record.dynamodb.NewImage.warParticipants.L
                        : [];

                    const maxCardsCollected = participants.sort((a, b) => b.M.cardsEarned.N - a.M.cardsEarned.N)[0].M
                        .cardsEarned.N;

                    const displayCollectedMostCards = join(
                        participants.filter(p => p.M.cardsEarned.N == maxCardsCollected).map(p => p.M.name.S),
                        ", ",
                        " og "
                    );

                    await sendDiscordMessage(
                        clan,
                        `Samledagen er avsluttet og vi har ${record.dynamodb.NewImage.participants.N} deltakere med. ${
                            skippedCollectionDayBattles
                                ? skippedCollectionDayBattles + " tok ikke alle samlekampene sine"
                                : "Alle tok alle samlekampene sine"
                        }. ${displayCollectedMostCards} samlet flest kort.`
                    );
                }
            }
        }
    }
};

const sendDiscordMessage = (clan, message) => {
    console.log("Fetching", clan, discordUrls[clan]);
    return fetch(discordUrls[clan], {
        method: "POST",
        body: JSON.stringify({ content: message }),
        headers: { "Content-Type": "application/json" },
    });
};
