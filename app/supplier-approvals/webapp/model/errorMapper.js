sap.ui.define([], function () {
    "use strict";

    const ERROR_PATTERNS = [
        [/^Application ID is required\./, "backendError.idRequired"],
        [/^Decision must be/, "backendError.invalidDecision"],
        [/^A rejection comment is required/, "backendError.commentRequired"],
        [/^Rejection comment must be at least (\\d+) characters/, "backendError.commentTooShort"],
        [/^Please select at least one field/, "backendError.revisionFieldRequired"],
        [/^Invalid revision field\\(s\\): (.*)\\.$/, "backendError.invalidRevisionField"],
        [/^Application not found\./, "backendError.applicationNotFound"],
        [/^This application has already been decided/, "backendError.alreadyDecided"],
        [/^A valid PDF certificate is required for AI analysis\./, "backendError.invalidCertificateForAi"],
        [/^AI analysis failed: (.*)$/, "backendError.aiFailed"],
        [/^AI returned an unexpected response format\./, "backendError.aiFormat"]
    ];

    return {
        map: function (sRawMessage, oBundle) {
            const sMessage = String(sRawMessage || "");
            for (const [oRegex, sKey] of ERROR_PATTERNS) {
                const aMatch = sMessage.match(oRegex);
                if (aMatch) {
                    const aArgs = aMatch.slice(1);
                    return aArgs.length ? oBundle.getText(sKey, aArgs) : oBundle.getText(sKey);
                }
            }
            return sMessage;
        }
    };
});
