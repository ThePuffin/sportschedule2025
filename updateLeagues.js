const fs = require('fs');
const path = require('path');

const API_URL = 'https://sportschedule2025backend.onrender.com/leagues';
const TEAMS_API_URL = 'https://sportschedule2025backend.onrender.com/teams';
const TARGET_FILE = path.join(__dirname, 'frontend/constants/Leagues.tsx');
const TEAMS_TARGET_FILE = path.join(__dirname, 'frontend/constants/Teams.tsx');

async function updateData() {
  console.log('🔄 Checking for updates...');

  // --- Update Leagues ---
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const leagues = await response.json();

    if (!Array.isArray(leagues)) {
      console.error('❌ Unexpected response format for leagues (expected array)');
    } else {
      const leaguesObj = {};
      leagues.forEach((l) => {
        if (l && l !== 'ALL') leaguesObj[l] = l;
      });

      const fileContent = [
        'export const LeaguesEnum: Record<string, string> = {',
        ...Object.keys(leaguesObj).map((key) => `  ${key}: '${leaguesObj[key]}',`),
        '};',
        '',
      ].join('\n');

      if (fs.existsSync(TARGET_FILE) && fs.readFileSync(TARGET_FILE, 'utf8') === fileContent) {
        console.log('👍 Leagues.tsx is already up to date.');
      } else {
        fs.writeFileSync(TARGET_FILE, fileContent);
        console.log(`✅ Leagues.tsx updated successfully at ${TARGET_FILE}`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not update leagues:', error.message);
  }

  // --- Update Teams ---
  try {
    const response = await fetch(TEAMS_API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const teams = await response.json();

    if (!Array.isArray(teams)) {
      console.error('❌ Unexpected response format for teams (expected array)');
    } else {
      const teamsObj = {};
      // Alphabetical sort for a cleaner file
      teams.sort((a, b) => {
        const nameA = a.name || a.teamCommonName || '';
        const nameB = b.name || b.teamCommonName || '';
        return nameA.localeCompare(nameB);
      });

      teams.forEach((t) => {
        // Look for ID and Name in likely fields
        const key = t.uniqueId || t.id;
        const value = t.teamCommonName || t.name || t.displayName;

        if (key && value) {
          teamsObj[key] = value;
        }
      });

      const fileContent = [
        'export const TeamsEnum: Record<string, string> = {',
        // Use double quotes for the value to handle apostrophes (e.g., St. John's)
        ...Object.keys(teamsObj).map((key) => `  '${key}': "${teamsObj[key].replace(/"/g, '\\"')}",`),
        '};',
        '',
      ].join('\n');

      if (fs.existsSync(TEAMS_TARGET_FILE) && fs.readFileSync(TEAMS_TARGET_FILE, 'utf8') === fileContent) {
        console.log('👍 Teams.tsx is already up to date.');
      } else {
        fs.writeFileSync(TEAMS_TARGET_FILE, fileContent);
        console.log(`✅ Teams.tsx updated successfully at ${TEAMS_TARGET_FILE}`);
      }

      // --- Update university logos keyed by id only ---
      try {
        const collegeLeagues = ['NCAAF', 'NCAAB', 'NCCABB', 'WNCAAB'];
        const logosObj = {};
        teams.forEach((t) => {
          if (collegeLeagues.includes(t.league)) {
            const parts = t.uniqueId ? t.uniqueId.split('-') : [];
            let key = parts.length > 1 ? parts[1] : t.abbrev || t.id || '';
            key = key.trim().toUpperCase();
            if (!key) return;

            const logo = t.teamLogo || '';
            if (logosObj[key]) {
              // if we already have this key stored, keep the first one
              return;
            }
            if (logo) {
              logosObj[key] = logo;
            }
          }
        });

        const logosFileContent = [
          'export const UniversityLogos: Record<string, string> = {',
          ...Object.keys(logosObj).map((key) => `  '${key}': '${logosObj[key]}',`),
          '};',
          '',
        ].join('\n');

        const LOGOS_TARGET_FILE = path.join(__dirname, 'frontend/constants/UniversityLogos.tsx');
        if (fs.existsSync(LOGOS_TARGET_FILE) && fs.readFileSync(LOGOS_TARGET_FILE, 'utf8') === logosFileContent) {
          console.log('👍 UniversityLogos.tsx is already up to date.');
        } else {
          fs.writeFileSync(LOGOS_TARGET_FILE, logosFileContent);
          console.log(`✅ UniversityLogos.tsx updated successfully at ${LOGOS_TARGET_FILE}`);
        }
      } catch (e) {
        console.warn('⚠️ Could not update university logos:', e.message);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not update teams:', error.message);
  }
}

updateData();
