import $ from 'jquery';
import 'ui/html_editor';

const { test, module: testModule } = QUnit;

testModule('lists', () => {
    [
        { listType: 'bullet', hasUi: false },
        { listType: 'ordered', hasUi: false },
        { listType: 'checked', hasUi: true },
        { listType: 'unchecked', hasUi: true },
    ].forEach(({ listType, hasUi }) => {
        test(`${listType} list item with should ${hasUi ? '' : 'not'} have visible ui element`, function(assert) {
            const instance = $('#htmlEditor').dxHtmlEditor({
                value: 'test'
            }).dxHtmlEditor('instance');
            const $element = instance.$element();

            instance.formatLine(0, 4, 'list', listType);

            const $listUi = $element.find('li > .ql-ui');
            const expectedVisibility = hasUi ? 'visible' : 'hidden';
            assert.strictEqual($listUi.length, 1, 'There is only one UI element');
            assert.strictEqual($listUi.css('visibility'), expectedVisibility, `UI element is ${hasUi ? '' : 'not'} visible`);
        });
    });

    test('ordered list should have counter-reset property set to default (T1220554)', function(assert) {
        const instance = $('#htmlEditor').dxHtmlEditor({
            value: 'test'
        }).dxHtmlEditor('instance');
        const $element = instance.$element();

        instance.formatLine(0, 4, 'list', 'ordered');

        const $contentOL = $element.find('ol');
        assert.strictEqual($contentOL.css('counterReset'), 'list-item 0', 'Ordered list has counter-reset property set to list-item 0');
    });
});
