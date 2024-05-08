import { Properties } from 'devextreme/ui/popover.d';
import url from '../../helpers/getPageUrl';
import { testAccessibility, Configuration } from '../../helpers/accessibility/test';
import { Options } from '../../helpers/generateOptionMatrix';

fixture.disablePageReloads`Accessibility`
  .page(url(__dirname, '../container.html'));

const options: Options<Properties> = {
  width: [300],
  visible: [true, false],
  showTitle: [true, false],
  title: [undefined, 'title'],
  showCloseButton: [true, false],
};

const a11yCheckConfig = {
  // NOTE: color-contrast issues
  rules: { 'color-contrast': { enabled: false } },
};

const configuration: Configuration = {
  component: 'dxPopover',
  a11yCheckConfig,
  options,
};

testAccessibility(configuration);
