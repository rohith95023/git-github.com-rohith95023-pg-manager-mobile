const fs = require('fs');
const path = require('path');

const baseDir = 'src';
const subdirs = [
  'api', 'components', 'components/hoc', 'components/partials', 'components/UnifiedStayManager',
  'context', 'hooks', 'pages', 'pages/Auth', 'pages/Beds', 'pages/Dashboard', 'pages/Expenses',
  'pages/Login', 'pages/PGs', 'pages/Payments', 'pages/ProfitLoss', 'pages/Reservations', 'pages/Rooms',
  'pages/Signup', 'pages/Tenants', 'services'
];

subdirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  const readmePath = path.join(fullPath, 'README.md');
  if (fs.existsSync(fullPath)) {
    const title = dir.split('/').pop().toUpperCase();
    fs.writeFileSync(readmePath, `# ${title}\n\nThis directory contains files for ${title}.\n`);
    console.log('Created:', readmePath);
  }
});
