sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("supplier.portal.controller.Login", {

        onInit: function () {},

        onLoginPress: async function () {
            const sEmail = this.byId("loginEmail").getValue();
            const sPassword = this.byId("loginPassword").getValue();
            const oErrorStrip = this.byId("loginError");
            const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            oErrorStrip.setVisible(false);

            try {
                const response = await fetch("/odata/v4/supplier/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: sEmail, password: sPassword })
                });

                const data = await response.json();

                if (!response.ok) {
                    oErrorStrip.setText(data.error ? data.error.message : oBundle.getText("login.failedGeneric"));
                    oErrorStrip.setVisible(true);
                    return;
                }

                sessionStorage.setItem("currentUserEmail", data.email);

                // Status-based redirect (form vs. process flow) will be added on Day 4.
                this.getOwnerComponent().getRouter().navTo("application");

            } catch (err) {
                oErrorStrip.setText(oBundle.getText("common.serverUnreachable"));
                oErrorStrip.setVisible(true);
            }
        },

        onNavToRegister: function () {
            this.getOwnerComponent().getRouter().navTo("register");
        }
    });
});