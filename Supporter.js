import GObject from 'gi://GObject';

export const Helper = GObject.registerClass({
    Properties: {
        'something-has-changed': GObject.ParamSpec.boolean(
            'something-has-changed',
            'Something has Changed',
            'If something has changed',
            GObject.ParamFlags.READWRITE,
            true
        ),
    },
},
    class Helper extends GObject.Object{
        constructor(params = {}) {
            super(params);
            this.something_has_changed = true;
        }
    });