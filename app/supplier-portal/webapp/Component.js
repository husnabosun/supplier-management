sap.ui.define([
    "sap/ui/core/UIComponent"
], function (UIComponent) {
    "use strict";

    return UIComponent.extend("supplier.portal.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            document.title = this.getModel("i18n").getResourceBundle().getText("application.portalTitle");
            this.getRouter().initialize();
        }
    });
});