import { getHeight, setHeight } from '../../core/utils/size';
import $ from '../../core/renderer';
import { getWindow } from '../../core/utils/window';
import devices from '../../core/devices';
import registerComponent from '../../core/component_registrator';
import { extend } from '../../core/utils/extend';
import Widget from '../widget/ui.widget';
import Button from '../button';
import Popover from '../popover';
import ToolbarMenuList from './ui.toolbar.menu.list';
import { isMaterial } from '../themes';
import { ChildDefaultTemplate } from '../../core/templates/child_default_template';
import { toggleItemFocusableElementTabIndex } from './ui.toolbar.utils';

const DROP_DOWN_MENU_CLASS = 'dx-dropdownmenu';
const DROP_DOWN_MENU_POPUP_CLASS = 'dx-dropdownmenu-popup';
const DROP_DOWN_MENU_POPUP_WRAPPER_CLASS = 'dx-dropdownmenu-popup-wrapper';
const DROP_DOWN_MENU_LIST_CLASS = 'dx-dropdownmenu-list';
const DROP_DOWN_MENU_BUTTON_CLASS = 'dx-dropdownmenu-button';

const POPUP_OPTION_MAP = {
    'popupWidth': 'width',
    'popupHeight': 'height',
    'popupMaxHeight': 'maxHeight',
};

const BUTTON_OPTION_MAP = {
    'buttonIcon': 'icon',
    'buttonText': 'text',
    'buttonWidth': 'width',
    'buttonHeight': 'height',
    'buttonTemplate': 'template'
};

const DropDownMenu = Widget.inherit({
    _supportedKeys: function() {
        let extension = {};

        if(!this.option('opened') || !this._list.option('focusedElement')) {
            extension = this._button._supportedKeys();
        }

        return extend(this.callBase(), extension, {
            tab: function() {
                this._popup && this._popup.hide();
            }
        });
    },

    _getDefaultOptions: function() {
        return extend(this.callBase(), {
            items: [],
            onItemClick: null,
            dataSource: null,
            itemTemplate: 'item',
            buttonText: '',
            buttonIcon: 'overflow',
            buttonWidth: undefined,
            buttonHeight: undefined,
            buttonTemplate: 'content',
            onButtonClick: null,
            popupWidth: 'auto',
            popupHeight: 'auto',
            activeStateEnabled: true,
            hoverStateEnabled: true,
            opened: false,
            deferRendering: false,
            popupPosition: {
                my: 'top right',
                at: 'bottom right',
                collision: 'fit flip',
                offset: { v: 4 }
            },
            popupAnimation: undefined,
            onItemRendered: null,
            popupMaxHeight: undefined,
            closeOnClick: true,
            useInkRipple: false,
            container: undefined,
        });
    },

    _defaultOptionsRules: function() {
        return this.callBase().concat([
            {
                device: function() {
                    return devices.real().deviceType === 'desktop' && !devices.isSimulator();
                },
                options: {
                    focusStateEnabled: true
                }
            },
            {
                device: function() {
                    return isMaterial();
                },
                options: {
                    useInkRipple: true,
                    popupAnimation: {
                        show: {
                            type: 'pop',
                            duration: 200,
                            from: { scale: 0 },
                            to: { scale: 1 }
                        },
                        hide: {
                            type: 'pop',
                            duration: 200,
                            from: { scale: 1 },
                            to: { scale: 0 }
                        }
                    }
                }
            },
        ]);
    },

    _init: function() {
        this.callBase();

        this.$element().addClass(DROP_DOWN_MENU_CLASS);

        this._initItemClickAction();
        this._initButtonClickAction();
    },

    _initItemClickAction: function() {
        this._itemClickAction = this._createActionByOption('onItemClick');
    },

    _initButtonClickAction: function() {
        this._buttonClickAction = this._createActionByOption('onButtonClick');
    },

    _initTemplates: function() {
        this._templateManager.addDefaultTemplates({
            content: new ChildDefaultTemplate('content')
        });
        this.callBase();
    },

    _initMarkup: function() {
        this._renderButton();
        this.callBase();
    },

    _render: function() {
        this.callBase();
        this.setAria({
            'role': 'menubar',
            'haspopup': true,
            'expanded': this.option('opened')
        });
    },

    _renderContentImpl: function() {
        if(this.option('opened')) {
            this._renderPopup();
        }
    },

    _clean: function() {
        this._cleanFocusState();

        if(this._popup) {
            this._popup.$element().remove();
            delete this._$popup;
        }
    },

    _renderButton: function() {
        const $button = this.$element().addClass(DROP_DOWN_MENU_BUTTON_CLASS);
        const config = this._buttonOptions();

        this._button = this._createComponent($button, Button, config);
    },

    _toggleActiveState: function($element, value, e) {
        this._button._toggleActiveState($element, value, e);
    },

    _buttonOptions: function() {
        return {
            text: this.option('buttonText'),
            icon: this.option('buttonIcon'),
            width: this.option('buttonWidth'),
            height: this.option('buttonHeight'),
            useInkRipple: this.option('useInkRipple'),
            template: this.option('buttonTemplate'),
            hoverStateEnabled: false,
            focusStateEnabled: false,
            onClick: (function(e) {
                this.option('opened', !this.option('opened'));
                this._buttonClickAction(e);
            }).bind(this)
        };
    },

    _toggleMenuVisibility: function(opened) {
        const state = opened === undefined ? !this._popup.option('visible') : opened;

        if(opened) {
            this._renderPopup();
        }

        this._popup.toggle(state);
        this.setAria('expanded', state);
    },

    _renderPopup: function() {
        if(this._$popup) {
            return;
        }

        const $popup = this._$popup = $('<div>').appendTo(this.$element());
        const config = this._popupOptions();

        this._popup = this._createComponent($popup, Popover, config); // TODO: Circular dep
    },

    _popupOptions: function() {
        return {
            onInitialized: function(args) {
                args.component.$wrapper()
                    .addClass(DROP_DOWN_MENU_POPUP_WRAPPER_CLASS)
                    .addClass(DROP_DOWN_MENU_POPUP_CLASS);
            },
            visible: this.option('opened'),
            deferRendering: false,
            contentTemplate: (function(contentElement) {
                this._renderList(contentElement);
            }).bind(this),
            position: this.option('popupPosition'),
            animation: this.option('popupAnimation'),
            onOptionChanged: (function(args) {
                if(args.name === 'visible') {
                    this.option('opened', args.value);
                }
            }).bind(this),
            target: this.$element(),
            height: this.option('popupHeight'),
            width: this.option('popupWidth'),
            maxHeight: this.option('popupMaxHeight'),
            container: this.option('container'),
            autoResizeEnabled: false
        };
    },

    _renderList: function(contentElement) {
        const $content = $(contentElement);
        const listConfig = this._listOptions();

        $content.addClass(DROP_DOWN_MENU_LIST_CLASS);

        this._list = this._createComponent($content, ToolbarMenuList, listConfig);

        const listMaxHeight = getHeight(getWindow()) * 0.5;
        if(getHeight($content) > listMaxHeight) {
            setHeight($content, listMaxHeight);
        }
    },

    _itemOptionChanged: function(item, property, value) {
        this._list?._itemOptionChanged(item, property, value);
        toggleItemFocusableElementTabIndex(this._list, item);
    },

    _listOptions: function() {
        return {
            dataSource: this._getListDataSource(),
            pageLoadMode: 'scrollBottom',
            indicateLoading: false,
            noDataText: '',
            itemTemplate: this.option('itemTemplate'),
            onItemClick: (function(e) {
                if(this.option('closeOnClick')) {
                    this.option('opened', false);
                }
                this._itemClickAction(e);
            }).bind(this),
            tabIndex: -1,
            focusStateEnabled: this.option('focusStateEnabled'),
            activeStateEnabled: this.option('activeStateEnabled'),
            onItemRendered: this.option('onItemRendered'),
            _areaTarget: this.$element(),
            _itemAttributes: { role: 'menuitem' }
        };
    },

    _getListDataSource() {
        return this.option('dataSource') ?? this.option('items');
    },

    _setListDataSource: function() {
        this._list?.option('dataSource', this._getListDataSource());

        delete this._deferRendering;
    },

    _getKeyboardListeners() {
        return this.callBase().concat([this._list]);
    },

    _toggleVisibility: function(visible) {
        this.callBase(visible);
        this._button.option('visible', visible);
    },

    _optionChanged: function(args) {
        const { name, value } = args;

        switch(name) {
            case 'items':
            case 'dataSource':
                if(this.option('deferRendering') && !this.option('opened')) {
                    this._deferRendering = true;
                } else {
                    this._setListDataSource();
                }
                break;
            case 'itemTemplate':
                this._list?.option(name, this._getTemplate(value));
                break;
            case 'onItemClick':
                this._initItemClickAction();
                break;
            case 'onButtonClick':
                this._buttonClickAction();
                break;
            case 'buttonIcon':
            case 'buttonText':
            case 'buttonWidth':
            case 'buttonHeight':
            case 'buttonTemplate':
                this._button.option(BUTTON_OPTION_MAP[name], value);
                this._renderPopup();
                break;
            case 'popupWidth':
            case 'popupHeight':
            case 'popupMaxHeight':
                this._popup.option(POPUP_OPTION_MAP[name], value);
                break;
            case 'useInkRipple':
                this._invalidate();
                break;
            case 'focusStateEnabled':
            case 'activeStateEnabled':
                this._list?.option(name, value);
                this.callBase(args);
                break;
            case 'onItemRendered':
                this._list?.option(name, value);
                break;
            case 'opened':
                if(this._deferRendering) {
                    this._setListDataSource();
                }

                this._toggleMenuVisibility(value);
                this._updateFocusableItemsTabIndex();
                break;
            case 'deferRendering':
            case 'popupPosition':
            case 'closeOnClick':
                break;
            case 'container':
                this._popup && this._popup.option(args.name, args.value);
                break;
            case 'disabled':
                if(this._list) {
                    this._updateFocusableItemsTabIndex();
                }
                break;
            default:
                this.callBase(args);
        }
    },

    _updateFocusableItemsTabIndex() {
        this.option('items').forEach(item => toggleItemFocusableElementTabIndex(this._list, item));
    },

    open: function() {
        this.option('opened', true);
    },

    close: function() {
        this.option('opened', false);
    }
});

registerComponent('dxDropDownMenu', DropDownMenu);

export default DropDownMenu;
