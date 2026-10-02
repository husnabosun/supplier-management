sap.ui.define([
    "sap/ui/core/UIComponent"
], function (UIComponent) {
    "use strict";

    return UIComponent.extend("supplier.approvals.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            document.title = this.getModel("i18n").getResourceBundle().getText("approvals.pageTitle");
        }
    });
});
