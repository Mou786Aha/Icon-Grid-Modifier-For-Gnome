import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';

import { ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class SizeChangerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        let toast_being_shown = false;
        let global_settings = this.getSettings();

        window.default_height = 470;
        window.default_width = 200;
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'fedora-login-icon',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Grid Size',
            description: 'Configure the size of the App Grid',
        });
        page.add(group);

        const rows_label = new Gtk.Label({label: "Select the number of Rows ↓"});
        rows_label.set_margin_bottom(10);

        let dynamic_button_store_rows = {};
        let dynamic_button_store_columns = {};

        const rows_box = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 6});
        rows_box.set_margin_bottom(6);
        const rows_box_two = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 6});
        rows_box_two.set_margin_bottom(10);

        const columns_label = new Gtk.Label({label: "Select the number of Columns ↓"});
        columns_label.set_margin_bottom(10);
        const columns_box = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 6});
        columns_box.set_margin_bottom(6);
        const columns_box_two = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 6});
        columns_box_two.set_margin_bottom(16);

        const apply_button_box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
        const apply_button = new Gtk.Button({label: "Apply Changes"});
        apply_button.connect("clicked", apply_changes.bind(this));

        function button_generator (count) {
            dynamic_button_store_rows[`row_button${count}`] = new Gtk.Button({label: `${count}`});
            dynamic_button_store_columns[`column_button${count}`] = new Gtk.Button({label: `${count}`});
            if (count <= 6) {
                rows_box.append(dynamic_button_store_rows[`row_button${count}`]);
                columns_box.append(dynamic_button_store_columns[`column_button${count}`]);
            }
            else {
                rows_box_two.append(dynamic_button_store_rows[`row_button${count}`]);
                columns_box_two.append(dynamic_button_store_columns[`column_button${count}`]);
            }
        }

        let count = 1;
        while (count <= 6) {
            button_generator(count);
            count++;
        }
        while (count <= 9) {
          button_generator(count);
          count++;
        }

        function connector (count) {
            dynamic_button_store_rows[`row_button${count}`].connect("clicked", button_active_row);
            dynamic_button_store_columns[`column_button${count}`].connect("clicked", button_active_column);
        }

        count = 1;
        while(count <= 9) {
            connector(count);
            count++;
        }

        function label_assign_again (which_one) {
            if (which_one == "row") {
                let local_count = 1;
                while (local_count <= 9) {
                    dynamic_button_store_rows[`row_button${local_count}`].label = `${local_count}`;
                    local_count++;
                }
            }
            else if (which_one == "column") {
                let local_count = 1;
                while (local_count <= 9) {
                    dynamic_button_store_columns[`column_button${local_count}`].label = `${local_count}`;
                    local_count++;
                }
            }
        }

        function button_active_row (current_button) {
            // the current_button.label changes the label on the UI, but doesn't affect current_button.label on next run for same button (i don't know why)
            label_assign_again("row");
            let button_id = current_button.label;
            dynamic_button_store_rows[`row_button${+button_id}`].label = `→ ${button_id}`;
            global_settings.set_value("row-value-and-current-active-button", GLib.Variant.new_string(button_id));
        }

        function button_active_column (current_button) {
            label_assign_again("column");
            let button_id = current_button.label;
            dynamic_button_store_columns[`column_button${+button_id}`].label = `→ ${button_id}`;
            global_settings.set_value("column-value-and-current-active-button", GLib.Variant.new_string(button_id));
        }

        apply_button_box.append(apply_button);

        group.add(rows_label);
        group.add(rows_box);
        group.add(rows_box_two);
        group.add(columns_label);
        group.add(columns_box);
        group.add(columns_box_two);
        group.add(apply_button_box);

        function initial_active_button_setter () {
            let settings = this.getSettings();
            let active_row_button_id = settings.get_string("row-value-and-current-active-button");
            let active_column_button_id = settings.get_string("column-value-and-current-active-button");
            let row_array = Object.values(dynamic_button_store_rows);
            let column_array = Object.values(dynamic_button_store_columns);
            for (let button of row_array) {
                if (button.label == active_row_button_id) {
                    button_active_row(button);
                    break;
                }
            }
            for (let button of column_array) {
                if (button.label == active_column_button_id) {
                    button_active_column(button);
                    break;
                }
            }
        }

        function apply_changes () {
            if (toast_being_shown == true) return;

            let mode = global_settings.get_string("grid-value");
            let index_of_x = mode.indexOf("x");
            let rows = mode.slice(0, index_of_x);
            let columns = mode.slice(index_of_x+1, mode.length);

            let settings = this.getSettings();
            let n_rows = settings.get_string("row-value-and-current-active-button");
            let n_columns = settings.get_string("column-value-and-current-active-button");
            let grid_value = `${n_rows}x${n_columns}`;

            if (n_rows == rows && n_columns == columns) {
                toast(grid_value, true);
                toast_being_shown = true;
                setTimeout(should_toast_again, 1010);
                return;
            }
            settings.set_value("grid-value", GLib.Variant.new_string(grid_value));
            settings.set_value("psuedo", GLib.Variant.new_boolean(false));
            relax();

            toast(grid_value, false);
            toast_being_shown = true;
            setTimeout(should_toast_again, 1010);
        }

        function should_toast_again () {
            toast_being_shown = false;
            global_settings.set_value('psuedo', GLib.Variant.new_boolean(true));
        }

        function toast (grid, second_role) {
            let toast;
            if (grid && second_role == false) {
                toast = new Adw.Toast({title: `Set Successfully ${grid} !`, timeout: 1});
            }
            else if (second_role == true) {
                toast = new Adw.Toast({title: `Already Set ${grid} !`, timeout: 1});
            }
            let overlay = new Adw.ToastOverlay();
            overlay.add_toast(toast);
            group.add(overlay);
        }
        
        function relax () {
            global_settings.set_value("did-something", GLib.Variant.new_boolean(true));
        }
        // startup calls 
        initial_active_button_setter.call(this);
    }
}
