import LocationCache from '../../cache/locations/LocationCache.js'

async function run() {
    await LocationCache.ready
    const result = await LocationCache.db.run(
        "DELETE FROM locations WHERE latitude = 'NaN' OR longitude = 'NaN'"
    );
    console.log('Registros NaN removidos:', result)
    // eslint-disable-next-line no-undef
    process.exit(0)
}

run();
