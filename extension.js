/* I have given up special_injection() == meant for adjusting icon size, instead invoking overview.showApps() and then _appDisplay.redisplay() should be enough to update icon size. This also minimizes, clutter.allocation errors
and maybe even eliminates them, but this time overview.showApps() should be called in always!*/

/* Notes for reviewers: 
1. this._gridModes line 71 and other lines is not my class's property, so it can't be accessed in disable(), so I can't set it to null like this._gridModes = null; But note that injectionmanager.clear()
is enough for clearing the whole injection itself. It's also true for other properties like this.layout_manager, that are not mine (they're of target class)
2. The timeout setTimeout() in caller() method is used for to display a toast in UI (during this timeout toast displays in UI prefs.js). Timeout doesn't run on future runs, it's only meant to inform the user about which grid mode has been set and whether applied already or not, while user tries out different modes. User won't see the toast if I remove timeout. For user info the toast should be displayed, you might ask why not stop invoking overview.showApps() and
display toast only, reason is that changes might not apply well while Appgrid is not invoked. if i immediately try to change gridMode without invoking AppGrid, it won't refresh at all! So timeout is necessary for user info
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

        if (this.settings.get_boolean("did-something") == false) {
            this.startup_tasks();
        }
    }
    // V-0.0.2 changes below = Aim: no longer assume the grid mode as 3x8
    startup_tasks () {
        let value = `${overview._overview._controls._appDisplay._grid.layout_manager.rows_per_page}x${overview._overview._controls._appDisplay._grid.layout_manager.columns_per_page}`;
        let G_value = GLib.Variant.new_string(value);
        this.settings.set_value("grid-value", G_value);
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

    injection (n_rows, n_columns) {
        let have_to_set_grid = "yes";
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
