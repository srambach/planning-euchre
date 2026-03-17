import { useState, useEffect } from 'react';
import {
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Divider,
  DropdownGroup,
} from '@patternfly/react-core';
import { MoonIcon, SunIcon, DesktopIcon } from '@patternfly/react-icons';

function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });
  const [contrast, setContrast] = useState(() => {
    return localStorage.getItem('contrast') || 'system';
  });

  useEffect(() => {
    const applyTheme = () => {
      let effectiveTheme = theme;
      let effectiveContrast = contrast;

      // Determine effective theme
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      }

      // Determine effective contrast
      if (contrast === 'system') {
        const prefersContrast = window.matchMedia('(prefers-contrast: more)').matches;
        effectiveContrast = prefersContrast ? 'on' : 'off';
      }

      // Apply theme classes
      document.documentElement.classList.remove('pf-v6-theme-dark', 'pf-v6-theme-light');
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('pf-v6-theme-dark');
      }

      // Apply contrast class
      if (effectiveContrast === 'on') {
        document.documentElement.classList.add('pf-v6-theme-high-contrast');
      } else {
        document.documentElement.classList.remove('pf-v6-theme-high-contrast');
      }
    };

    applyTheme();

    // Listen for system preference changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleChange = () => applyTheme();

    if (theme === 'system') {
      darkModeQuery.addEventListener('change', handleChange);
    }

    if (contrast === 'system') {
      contrastQuery.addEventListener('change', handleChange);
    }

    return () => {
      darkModeQuery.removeEventListener('change', handleChange);
      contrastQuery.removeEventListener('change', handleChange);
    };
  }, [theme, contrast]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    setIsOpen(false);
  };

  const handleContrastChange = (newContrast) => {
    setContrast(newContrast);
    localStorage.setItem('contrast', newContrast);
    setIsOpen(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      default:
        return <DesktopIcon />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'System';
    }
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      popperProps={{
        position: 'right',
        enableFlip: true,
      }}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          variant="plain"
          icon={getThemeIcon()}
        >
          {getThemeLabel()}
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownGroup label="Theme">
          <DropdownItem
            icon={<SunIcon />}
            onClick={() => handleThemeChange('light')}
            isSelected={theme === 'light'}
          >
            Light
          </DropdownItem>
          <DropdownItem
            icon={<MoonIcon />}
            onClick={() => handleThemeChange('dark')}
            isSelected={theme === 'dark'}
          >
            Dark
          </DropdownItem>
          <DropdownItem
            icon={<DesktopIcon />}
            onClick={() => handleThemeChange('system')}
            isSelected={theme === 'system'}
          >
            System
          </DropdownItem>
        </DropdownGroup>
        <Divider />
        <DropdownGroup label="Contrast">
          <DropdownItem
            onClick={() => handleContrastChange('off')}
            isSelected={contrast === 'off'}
          >
            Off
          </DropdownItem>
          <DropdownItem
            onClick={() => handleContrastChange('on')}
            isSelected={contrast === 'on'}
          >
            On
          </DropdownItem>
          <DropdownItem
            icon={<DesktopIcon />}
            onClick={() => handleContrastChange('system')}
            isSelected={contrast === 'system'}
          >
            System
          </DropdownItem>
        </DropdownGroup>
      </DropdownList>
    </Dropdown>
  );
}

export default ThemeSwitcher;
