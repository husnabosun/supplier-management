sap.ui.define([], function () {
    "use strict";

    const ERROR_PATTERNS = [
        [/^Email and password are required\./, "backendError.credentialsRequired"],
        [/^Please provide a valid email address\./, "backendError.invalidEmail"],
        [/^Password must be at least 8/, "backendError.weakPassword"],
        [/^This email address is already registered\./, "backendError.emailTaken"],
        [/^Invalid email or password\./, "backendError.invalidCredentials"],
        [/^(?:Email is required|Missing user context)\./, "backendError.userContextMissing"],
        [/^Company name is required\./, "backendError.companyRequired"],
        [/^Contact person is required\./, "backendError.contactRequired"],
        [/^Certificate file is required\./, "backendError.certificateRequired"],
        [/^A new certificate must be uploaded/, "backendError.newCertificateRequired"],
        [/^Phone number may only contain/, "backendError.invalidPhone"],
        [/^You already have a submitted application\./, "backendError.duplicateApplication"],
        [/^Only PDF files are allowed/, "backendError.onlyPdf"],
        [/^Certificate file must not exceed 10 MB\./, "backendError.fileTooLarge"],
        [/^The uploaded file is not a valid PDF\./, "backendError.notValidPdf"],
        [/^No (?:existing )?application found/, "backendError.applicationNotFound"],
        [/^Only rejected applications can be re-applied\./, "backendError.onlyRejectedReapply"]
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
