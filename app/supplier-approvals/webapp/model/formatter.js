sap.ui.define([], function () {
    "use strict";

    return {
        statusState: function (sStatus) {
            switch (sStatus) {
                case "APPROVED": return "Success";
                case "REJECTED": return "Error";
                case "SUBMITTED": return "Warning";
                default: return "None";
            }
        }
    };
});
