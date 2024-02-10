/*                                         ISSUES
1. Consider helping with this warning and tell me how serious is this: 

(gnome-shell:4470): Clutter-WARNING **: 17:39:03.933: Can't update stage views actor <unnamed>[<Gjs_ui_appDisplay_AppDisplay>:0x55561e970ab0] is on because it needs an allocation.

(gnome-shell:4470): Clutter-WARNING **: 17:39:03.933: Can't update stage views actor <unnamed>[<StBoxLayout>:0x55561ee47230] is on because it needs an allocation.

Occurs when running injection() == meant for live testing, stable_injection() works fine (meant for future runs)
*/

/*                                          CREDITS
                    1. Line 80 to 97 has been taken from Gnome Shell source code
*/
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';
import {IconGrid, IconGridLayout} from 'resource:///org/gnome/shell/ui/iconGrid.js';
import { Helper } from './Supporter.js';
import {overview} from 'resource:///org/gnome/shell/ui/main.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

export default class SizeChanger extends Extension {
    constructor (metadata) {
        super(metadata);
        this._injectionManager = new InjectionManager();
    }

    enable () {
        let change_container = new Helper();

        this.settings = this.getSettings();
        this.settings.bind("psuedo", change_container, 'something_has_changed', Gio.SettingsBindFlags.DEFAULT);

        if (this.settings.get_boolean("did-something")) {
            this.stable_injection();
        }

        this.ref = this.settings.connect("changed::psuedo", this.caller.bind(this));
        if (this.settings.get_boolean("did-something") == false) {
            this.openPreferences();
        }
        this.adaptToSizeParams = null;
        this.special_injection_helper = "not-initialized";
        }

    injection_new ()  {
        this._injectionManager.overrideMethod(IconGrid.prototype, '_findBestModeForSize', originalMethod => {
            return function (width, height) {
                if (this._gridModes[0].rows == 3 && this._gridModes[0].columns == 3) { this._gridModes = [{rows: 4, columns: 4}]}
                else {this._gridModes = [{rows: 4, columns: 4}]}
                originalMethod.call(this, width, height);
            }
        });
    }

    stable_injection () {
        let mode = this.settings.get_string("grid-value");
        let index_of_x = mode.indexOf("x");
        let n_rows = mode.slice(0, index_of_x);
        let n_columns = mode.slice(index_of_x+1, mode.length);
        this._injectionManager.overrideMethod(IconGrid.prototype, '_findBestModeForSize', originalMethod => {
            return function (width, height) {
                if (this._gridModes[0].rows == 3 && this._gridModes[0].columns == 3) { this._gridModes = [{rows: 4, columns: 4}]}
                else {this._gridModes = [{rows: n_rows, columns: n_columns}];}
                originalMethod.call(this, width, height);
                this.layout_manager._updatePages();
                for (let pageIndex = 0; pageIndex < this.layout_manager._pages.length; pageIndex++) {
                    this.layout_manager._fillItemVacancies(pageIndex);
                }
            }
        });
    }

    special_injection () {
        let injection = this.special_injection_helper;
        let adaptToSizeParamsHelper = { pageWidth: null, pageHeight: null};
        this._injectionManager.overrideMethod(IconGridLayout.prototype, 'adaptToSize', originalMethod => {
            return function (pageWidth, pageHeight) {
                originalMethod.call(this, pageWidth, pageHeight);
                if (injection == "initialized") {
                    // It's not me
                    this._pageWidth = pageWidth;
                    this._pageHeight = pageHeight;
                    this._pageSizeChanged = true;

                    if (this._updateIconSizesLaterId === 0) {
                        const laters = global.compositor.get_laters();
                        this._updateIconSizesLaterId = laters.add(Meta.LaterType.BEFORE_REDRAW, () => {
                            const iconSize = this._findBestIconSize();
                                if (this._iconSize !== iconSize) {
                                    this._iconSize = iconSize;
                                    for (const child of this._container) child.icon.setIconSize(iconSize); this.notify('icon-size');
                                }
                            this._updateIconSizesLaterId = 0;
                            return GLib.SOURCE_REMOVE;
                        });
                    }
                }
                // Till here
                injection = "is-done";
                adaptToSizeParamsHelper.pageWidth = pageWidth;
                adaptToSizeParamsHelper.pageHeight = pageHeight;

            }
        });
        this.adaptToSizeParams = adaptToSizeParamsHelper;
    }

    injection (n_rows, n_columns) {
        let have_to_set_grid = "yes";
        let adaptToSizeParamsHelper = this.adaptToSizeParams;
        this._injectionManager.overrideMethod(IconGrid.prototype, '_findBestModeForSize', originalMethod => {
            return function (width, height) {
                if (this._gridModes[0].rows == 3 && this._gridModes[0].columns == 3) { this._gridModes = [{rows: 4, columns: 4}]}
                else {
                    this._gridModes = [{rows: n_rows, columns: n_columns}];
                    originalMethod.call(this, width, height);
                    if (have_to_set_grid == "yes") {
                        this.layout_manager.rows_per_page = n_rows;
                        this.layout_manager.columns_per_page = n_columns;
                    }
                }
                overview._overview._controls._appDisplay._grid.layout_manager.adaptToSize(adaptToSizeParamsHelper.pageWidth, adaptToSizeParamsHelper.pageHeight);
                this.layout_manager._updatePages();
                for (let pageIndex = 0; pageIndex < this.layout_manager._pages.length; pageIndex++) {
                    this.layout_manager._fillItemVacancies(pageIndex);
                }
                have_to_set_grid = "no";
            }
        });
    }

    caller () {
        if (this.settings.get_boolean("psuedo") == true) return;
        setTimeout(runner.bind(this), 900);
        function runner () {
            overview.showApps();
            this._injectionManager?.clear();
            this.special_injection_helper = "initialized";
            this.special_injection();
            let mode = this.settings.get_string("grid-value");
            let index_of_x = mode.indexOf("x");
            let rows = mode.slice(0, index_of_x);
            let columns = mode.slice(index_of_x+1, mode.length);
            this.injection(rows, columns);
            overview._overview._controls._appDisplay._redisplay();
        }
    }

    disable () {
        this._injectionManager.clear();
        this.settings.disconnect(this.ref);
        this.settings = null;
    }
}
