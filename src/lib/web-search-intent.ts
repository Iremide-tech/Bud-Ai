export type WebSearchIntent = {
    shouldSearch: boolean;
    explicit: boolean;
};

export function getWebSearchIntent(userMessage: string): WebSearchIntent {
    const text = userMessage.toLowerCase();

    const explicitPatterns = [
        /\bsearch\b/,
        /\blook up\b/,
        /\blookup\b/,
        /\bgoogle\b/,
        /\bbrowse\b/,
        /\bonline\b/,
        /\binternet\b/,
        /\bweb\b/
    ];

    const timeSensitivePatterns = [
        /\blatest\b/,
        /\brecent\b/,
        /\bcurrent\b/,
        /\btoday\b/,
        /\bthis week\b/,
        /\bnews\b/,
        /\bprice\b/,
        /\bstock\b/,
        /\bscore\b/,
        /\bweather\b/,
        /\bupdate\b/,
        /\brelease date\b/,
        /\bversion\b/,
        /\bceo\b/,
        /\bpresident\b/
    ];

    const explicit = explicitPatterns.some((re) => re.test(text));
    const timeSensitive = timeSensitivePatterns.some((re) => re.test(text));
    return { shouldSearch: explicit || timeSensitive, explicit };
}
