const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const MISSING_CONFIG_MESSAGE =
    'Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_KEY ' +
    'in backend/.env when running locally, or in your hosting provider\'s environment ' +
    'settings when deployed.';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error(MISSING_CONFIG_MESSAGE);

    // Exiting inside a serverless function takes down the whole invocation and
    // the platform can only report an opaque crash. Running as a normal server
    // it is better to fail loudly at startup; deployed, let the request reach
    // the route so it can answer with something the owner can act on.
    if (!process.env.VERCEL) {
        process.exit(1);
    }

    const unavailable = () => {
        throw new Error(MISSING_CONFIG_MESSAGE);
    };

    module.exports = new Proxy({}, { get: unavailable, apply: unavailable });
} else {
    module.exports = createClient(supabaseUrl, supabaseServiceKey);
}
