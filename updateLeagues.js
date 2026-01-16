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
      // Tri alphabétique pour un fichier plus propre
      teams.sort((a, b) => {
        const nameA = a.name || a.teamCommonName || '';
        const nameB = b.name || b.teamCommonName || '';
        return nameA.localeCompare(nameB);
      });

      teams.forEach((t) => {
        // On cherche l'ID et le Nom dans les champs probables
        const key = t.uniqueId || t.id;
        const value = t.teamCommonName || t.name || t.displayName;

        if (key && value) {
          teamsObj[key] = value;
        }
      });

      const fileContent = [
        'export const TeamsEnum: Record<string, string> = {',
        // Utilisation de guillemets doubles pour la valeur pour gérer les apostrophes (ex: St. John's)
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
    }
  } catch (error) {
    console.warn('⚠️ Could not update teams:', error.message);
  }
}

updateData();
