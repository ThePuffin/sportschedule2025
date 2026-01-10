import { Team } from './types';

export const randomNumber = (max) => {
  return Math.floor(Math.random() * (max - 0 + 1) + 0);
};

export const getRandomTeamId = (teams: Team[]) => {
  return teams[randomNumber(teams.length) - 1]?.uniqueId;
};

export const addNewTeamId = (selection: string[], teams: Team[]) => {
  const randomId = getRandomTeamId(teams);
  if (randomId && !selection.includes(randomId)) {
    selection.push(randomId);
  }
  return selection;
};

export const removeLastTeamId = (selection: string[]) => {
  selection.pop();
  return selection;
};

interface ICSFileParams {
  homeTeam: string;
  awayTeam: string;
  startTimeUTC: string;
  arenaName: string;
  placeName: string;
}

const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const generateICSFile = ({ homeTeam, awayTeam, startTimeUTC, arenaName, placeName }: ICSFileParams) => {
  const startDate = new Date(startTimeUTC);

  if (isNaN(startDate.getTime())) {
    console.error('Invalid startTimeUTC provided:', startTimeUTC);

    return;
  }

  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
  const now = new Date();

  const eventUID = `${formatICSDate(startDate)}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${eventUID}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${homeTeam} vs ${awayTeam}`,
    `LOCATION:${arenaName}, ${placeName}`,
    `DESCRIPTION:Game between ${homeTeam} and ${awayTeam} at ${arenaName}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  try {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize filename slightly
    const filename = `${homeTeam}_vs_${awayTeam}.ics`.replace(/[^a-z0-9_.-]/gi, '_');
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (e) {
    console.error('Error generating or downloading ICS file:', e);
    return;
  }
};

export const translateWord = (word: string) => {
  let translation: { [key: string]: string } = {};
  const language = navigator.language.split('-')[0];
  switch (language) {
    case 'fr':
      translation = {
        all: 'TOUS',
        gamesOfDay: 'Programme du jour',
        remainingGames: 'Matchs restants',
        calendars: 'Calendriers',
        noResults: 'Pas de résultats',
        inProgress: 'En cours',
        noOptionsAvailable: 'Aucune option disponible',
        wrongPage: "Cette page n'existe pas.",
        homeScreen: "Aller à la page d'accueil!",
        selectAll: 'Tout sélectionner',
        Filter: 'Filtrer',
        ended: 'Terminé',
        yourFav: 'Vos équipes favorites',
        register: 'Sauvegarder',
        cancel: 'Annuler',
        deleteSelection: 'Supprimer la sélection',
        addColumn: 'Ajouter une colonne',
        removeColumn: 'Supprimer une colonne',
      };
      break;
    case 'de':
      translation = {
        all: 'alle',
        gamesOfDay: 'Spiele des Tages',
        remainingGames: 'Verbleibende Spiele',
        calendars: 'Kalender',
        noResults: 'Keine Ergebnisse',
        inProgress: 'In Bearbeitung',
        noOptionsAvailable: 'Keine Optionen verfügbar',
        wrongPage: 'Diese Seite existiert nicht.',
        homeScreen: 'Zur Startseite gehen!',
        selectAll: 'Alle auswählen',
        Filter: 'Filtern',
        ended: 'Beendet',
        yourFav: 'Deine Lieblingsteams',
        register: 'Speichern',
        cancel: 'Abbrechen',
        deleteSelection: 'Auswahl löschen',
        addColumn: 'Spalte hinzufügen',
        removeColumn: 'Spalte entfernen',
      };
      break;
    case 'es':
      translation = {
        all: 'TODOS',
        gamesOfDay: 'Juegos del día',
        remainingGames: 'Juegos restantes',
        calendars: 'Calendarios',
        noResults: 'Sin resultados',
        inProgress: 'En progreso',
        noOptionsAvailable: 'No hay opciones disponibles',
        wrongPage: 'Esta página no existe.',
        homeScreen: 'Ir a la pantalla de inicio!',
        selectAll: 'Seleccionar todo',
        Filter: 'Filtrar',
        ended: 'Finalizado',
        yourFav: 'Tus equipos favoritos',
        register: 'Guardar',
        cancel: 'Cancelar',
        deleteSelection: 'Eliminar selección',
        addColumn: 'Añadir columna',
        removeColumn: 'Eliminar columna',
      };
      break;

    case 'it':
      translation = {
        all: 'TUTTI',
        gamesOfDay: 'Giochi del giorno',
        remainingGames: 'Giochi rimanenti',
        calendars: 'Calendari',
        noResults: 'Nessun risultato',
        inProgress: 'In corso',
        noOptionsAvailable: 'Nessuna opzione disponibile',
        wrongPage: 'Questa pagina non esiste.',
        homeScreen: 'Vai alla pagina iniziale!',
        selectAll: 'Seleziona tutto',
        Filter: 'Filtrare',
        ended: 'Terminato',
        yourFav: 'Le tue squadre preferite',
        register: 'Salva',
        cancel: 'Annulla',
        deleteSelection: 'Elimina selezione',
        addColumn: 'Aggiungi colonna',
        removeColumn: 'Rimuovi colonna',
      };
      break;
    case 'ja':
      translation = {
        all: 'すべて',
        gamesOfDay: 'その日のゲーム',
        remainingGames: '残りのゲーム',
        calendars: 'カレンダー',
        noResults: '結果なし',
        inProgress: '進行中',
        noOptionsAvailable: '利用可能なオプションはありません',
        wrongPage: 'このページは存在しません。',
        homeScreen: 'ホーム画面に移動します！',
        selectAll: 'すべて選択',
        Filter: 'フィルター',
        ended: '終了',
        yourFav: 'お気に入りのチーム',
        register: '保存',
        cancel: 'キャンセル',
        deleteSelection: '選択を削除',
        addColumn: '列を追加',
        removeColumn: '列を削除',
      };
      break;
    case 'ko':
      translation = {
        all: '전체',
        gamesOfDay: '그날의 게임',
        remainingGames: '남은 게임',
        calendars: '달력',
        noResults: '결과 없음',
        inProgress: '진행 중',
        noOptionsAvailable: '사용 가능한 옵션이 없습니다',
        wrongPage: '이 페이지는 존재하지 않습니다.',
        homeScreen: '홈 화면으로 이동하세요!',
        selectAll: '모두 선택',
        Filter: '필터',
        ended: '종료됨',
        yourFav: '좋아하는 팀',
        register: '저장',
        cancel: '취소',
        deleteSelection: '선택 삭제',
        addColumn: '열 추가',
        removeColumn: '열 제거',
      };
      break;
    case 'nl':
      translation = {
        all: 'ALLE',
        gamesOfDay: 'Spelkalender',
        remainingGames: 'Resterende spellen',
        calendars: 'Kalenders',
        noResults: 'Geen resultaten',
        inProgress: 'In afwachting',
        noOptionsAvailable: 'Geen opties beschikbaar',
        wrongPage: 'Deze pagina bestaat niet.',
        homeScreen: 'Ga naar de thuispagina!',
        selectAll: 'Alles selecteren',
        Filter: 'Filteren',
        ended: 'Afgerond',
        yourFav: 'Je favoriete teams',
        register: 'Opslaan',
        cancel: 'Annuleren',
        deleteSelection: 'Selectie verwijderen',
        addColumn: 'Kolom toevoegen',
        removeColumn: 'Kolom verwijderen',
      };
      break;
    case 'pt':
      translation = {
        all: 'TODOS',
        gamesOfDay: 'Jogos do dia',
        remainingGames: 'Jogos restantes',
        calendars: 'Calendários',
        noResults: 'Sem resultados',
        inProgress: 'Em andamento',
        noOptionsAvailable: 'Nenhuma opção disponível',
        wrongPage: 'Esta página não existe.',
        homeScreen: 'Ir para a página inicial!',
        selectAll: 'Selecionar tudo',
        Filter: 'Filtrar',
        ended: 'Encerrado',
        yourFav: 'Seus times favoritos',
        register: 'Salvar',
        cancel: 'Cancelar',
        deleteSelection: 'Excluir seleção',
        addColumn: 'Adicionar coluna',
        removeColumn: 'Remover coluna',
      };
      break;
    case 'ru':
      translation = {
        all: 'ВСЕ',
        gamesOfDay: 'Игры дня',
        remainingGames: 'Оставшиеся игры',
        calendars: 'Календари',
        noResults: 'Нет результатов',
        inProgress: 'В процессе',
        noOptionsAvailable: 'Нет доступных вариантов',
        wrongPage: 'Эта страница не существует.',
        homeScreen: 'Перейти на главную страницу!',
        selectAll: 'Выбрать все',
        Filter: 'Фильтровать',
        ended: 'Завершено',
        yourFav: 'Ваши любимые команды',
        register: 'Сохранить',
        cancel: 'Отмена',
        deleteSelection: 'Удалить выделение',
        addColumn: 'Добавить столбец',
        removeColumn: 'Удалить столбец',
      };
      break;
    case 'zh':
      translation = {
        all: '所有',
        gamesOfDay: '当天的比赛',
        remainingGames: '剩余比赛',
        calendars: '日历',
        noResults: '没有结果',
        inProgress: '进行中',
        noOptionsAvailable: '沒有可用選項',
        wrongPage: '此页面不存在。',
        homeScreen: '前往首页！',
        selectAll: '全选',
        Filter: '筛选',
        ended: '已结束',
        yourFav: '你最喜欢的球队',
        register: '保存',
        cancel: '取消',
        deleteSelection: '删除选择',
        addColumn: '添加列',
        removeColumn: '删除列',
      };
      break;
    default:
      translation = {
        all: 'ALL',
        gamesOfDay: 'Games of the day',
        remainingGames: 'Remaining games',
        calendars: 'Calendars',
        noResults: 'No results',
        inProgress: 'In progress',
        noOptionsAvailable: 'No options available',
        wrongPage: "This screen doesn't exist.",
        homeScreen: 'Go to home screen!',
        selectAll: 'Select All',
        Filter: 'Filter',
        ended: 'Ended',
        yourFav: 'Your favorite teams',
        register: 'Save',
        cancel: 'Cancel',
        deleteSelection: 'Delete Selection',
        addColumn: 'Add Column',
        removeColumn: 'Remove Column',
      };
      break;
  }
  return translation[word] ?? '';
};
