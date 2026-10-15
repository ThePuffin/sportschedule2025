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
  // Two buckets so Teams.tsx only lists teams that actually play:
  //   - regular leagues   → at least 10 active games  (minGames=10)
  //   - Olympic teams     → at least 1 active game    (minGames=1)
  try {
    const [regularResp, olympicResp] = await Promise.all([
      fetch(`${TEAMS_API_URL}?minGames=10`),
      fetch(`${TEAMS_API_URL}?minGames=1`),
    ]);
    if (!regularResp.ok || !olympicResp.ok) {
      throw new Error(
        `HTTP error! status: ${regularResp.status} / ${olympicResp.status}`,
      );
    }

    const regularTeams = await regularResp.json();
    const olympicTeams = await olympicResp.json();

    if (!Array.isArray(regularTeams) || !Array.isArray(olympicTeams)) {
      console.error(
        '❌ Unexpected response format for teams (expected array)',
      );
    } else {
      const teamsObj = {};

      const addTeam = (t) => {
        const key = t.uniqueId || t.id;
        const value = t.teamCommonName || t.name || t.displayName;
        if (key && value) teamsObj[key] = value;
      };

      // Regular teams: minGames=10 already excludes inactive/historical teams.
      regularTeams.forEach(addTeam);

      // Olympic teams: only those whose id starts with OLYMPICS-, so a single
      // match is enough to list a country delegation.
      olympicTeams
        .filter((t) => String(t.uniqueId || t.id || '').startsWith('OLYMPICS-'))
        .forEach(addTeam);

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
        // Build the new logos map from the API (only non-empty college logos).
        const newLogos = {};
        regularTeams.forEach((t) => {
          if (collegeLeagues.includes(t.league)) {
            const parts = t.uniqueId ? t.uniqueId.split('-') : [];
            let key = parts.length > 1 ? parts[1] : t.abbrev || t.id || '';
            key = key.trim().toUpperCase();
            if (!key) return;

            const logo = t.teamLogo || '';
            if (newLogos[key]) {
              // if we already have this key stored, keep the first one
              return;
            }
            if (logo) {
              newLogos[key] = logo;
            }
          }
        });

        // Merge with the existing file so we never remove a previously
        // stored logo/entry — we only add new keys or update existing ones.
        const LOGOS_TARGET_FILE = path.join(__dirname, 'frontend/constants/UniversityLogos.tsx');
        const existingLogos = {};
        try {
          if (fs.existsSync(LOGOS_TARGET_FILE)) {
            const raw = fs.readFileSync(LOGOS_TARGET_FILE, 'utf8');
            const lineRe = /  '([^']+)': '([^']*)',/g;
            let m;
            while ((m = lineRe.exec(raw)) !== null) {
              existingLogos[m[1]] = m[2];
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not read existing UniversityLogos.tsx:', e.message);
        }

        const mergedLogos = { ...existingLogos };
        for (const key of Object.keys(newLogos)) {
          mergedLogos[key] = newLogos[key];
        }

        // Keep the same ordering as the existing file, then append new keys.
        const orderedKeys = [
          ...Object.keys(existingLogos).filter((k) => mergedLogos.hasOwnProperty(k)),
          ...Object.keys(mergedLogos).filter((k) => !existingLogos.hasOwnProperty(k)),
        ];

        const logosFileContent = [
          'export const UniversityLogos: Record<string, string> = {',
          ...orderedKeys.map((key) => `  '${key}': '${mergedLogos[key]}',`),
          '};',
          '',
        ].join('\n');

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
