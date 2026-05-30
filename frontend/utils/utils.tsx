import { maxFavoritesNumber } from '@/constants/Constants';
import { saveCache } from '@/utils/fetchData';
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

export const addFavoriteTeam = (favoriteTeams: string[], teamId: string) => {
  const isIncluded = favoriteTeams.includes(teamId);

  if (isIncluded && favoriteTeams.length > 1) {
    // Only remove team if at least one remains after
    const updatedFavorites = favoriteTeams.filter((id) => id !== teamId);
    saveCache('favoriteTeams', updatedFavorites);
  } else if (!isIncluded && favoriteTeams.length < maxFavoritesNumber) {
    const updatedFavorites = [...favoriteTeams, teamId];
    saveCache('favoriteTeams', updatedFavorites);
  }
  if (globalThis.window !== undefined) {
    globalThis.window.dispatchEvent(new Event('favoritesUpdated'));
  }
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
        focusTeam: 'Suivre une équipe',
        calendars: 'Agenda',
        connection: 'Connexion',
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
        select: 'Faites votre choix',
        selectMultiple: 'Sélectionnez vos choix',
        nothing: 'Aucun',
        filterTeams: 'Filtrer les équipes',
        filterLeagues: 'Filtrer les ligues',
        filterMonths: 'Filtrer les mois',
        findTeam: 'Trouver une équipe',
        leagueSurveilled: 'Ligue(s) à afficher',
        score: 'Résultat final',
        favorites: 'FAVORIS',
        followLive: 'Suivre le direct',
        scoreView: 'Afficher les scores',
        localizeArena: "Localiser l'arène",
        downloadICS: 'Fichier .ics',
        gameDetails: 'Détails du match',
        events: 'Evenements',
        final: 'Finalisation',
        standings: 'Classement',
        currentScore: 'Score actuel',
        showHidePreviousScores: 'Afficher/Masquer les scores précédents',
        postponedGame: 'Match reporté',
        signInWithGoogle: 'Se connecter avec Google',
        signOut: 'Se déconnecter',
        authentication: 'Identifiez vous',
        continueWithEmail: 'Continuer avec un e-mail',
        forgotPassword: 'Mot de passe oublié ?',
        loggedInAs: 'Vous êtes connecté avec :',
      };
      break;
    case 'de':
      translation = {
        all: 'alle',
        gamesOfDay: 'Spiele des Tages',
        remainingGames: 'Verbleibende Spiele',
        focusTeam: 'Team verfolgen',
        calendars: 'Agenda',
        connection: 'Verbindung',
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
        select: 'Wähle deine Auswahl',
        selectMultiple: 'Wählen Sie Ihre Optionen',
        nothing: 'Nichts',
        filterTeams: 'Teams filtern',
        filterLeagues: 'Leagues filtern',
        filterMonths: 'Monate filtern',
        findTeam: 'Ein Team finden',
        leagueSurveilled: 'Anzuzeigende Liga/Ligen',
        score: 'Endstand',
        favorites: 'FAVORITEN',
        followLive: 'Live verfolgen',
        scoreView: 'Spielstände anzeigen',
        localizeArena: 'Arena lokalisieren',
        downloadICS: 'ICS-Datei',
        gameDetails: 'Spieldetails',
        events: 'Ereignisse',
        final: 'Ergebnis',
        standings: 'Standings',
        currentScore: 'Aktueller Spielstand',
        showHidePreviousScores: 'Vorherige Scores anzeigen/verstecken',
        postponedGame: 'Spiel verschoben',
        signInWithGoogle: 'Mit Google anmelden',
        signOut: 'Abmelden',
        authentication: 'Identifizieren Sie sich',
        continueWithEmail: 'Mit E-Mail fortfahren',
        forgotPassword: 'Passwort vergessen?',
        loggedInAs: 'Angemeldet als:',
      };
      break;
    case 'es':
      translation = {
        all: 'TODOS',
        gamesOfDay: 'Juegos del día',
        remainingGames: 'Juegos restantes',
        focusTeam: 'Seguir a un equipo',
        calendars: 'Agenda',
        connection: 'Conexión',
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
        select: 'Selecciona tu opción',
        selectMultiple: 'Seleccione sus opciones',
        nothing: 'Nada',
        filterTeams: 'Filtrar equipos',
        filterLeagues: 'Filtrar ligas',
        filterMonths: 'Filtrar meses',
        findTeam: 'Encontrar un equipo',
        leagueSurveilled: 'Liga(s) a mostrar',
        score: 'Marcador final',
        favorites: 'FAVORITOS',
        followLive: 'Seguir en vivo',
        scoreView: 'Mostrar marcadores',
        localizeArena: 'Localizar arena',
        downloadICS: 'Archivo .ics',
        gameDetails: 'Detalles del juego',
        events: 'Eventos',
        final: 'Final',
        standings: 'Clasificaciones',
        currentScore: 'Marcador actual',
        showHidePreviousScores: 'Mostrar/Ocultar marcadores anteriores',
        postponedGame: 'Juego pospuesto',
        signInWithGoogle: 'Iniciar sesión con Google',
        signOut: 'Cerrar sesión',
        authentication: 'Identificarse',
        continueWithEmail: 'Continuar con el correo electrónico',
        forgotPassword: '¿Has olvidado tu contraseña?',
        loggedInAs: 'Conectado como:',
      };
      break;

    case 'it':
      translation = {
        all: 'TUTTI',
        gamesOfDay: 'Giochi del giorno',
        remainingGames: 'Giochi rimanenti',
        focusTeam: 'Segui una squadra',
        calendars: 'Agenda',
        connection: 'Connessione',
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
        select: 'Seleziona la tua scelta',
        selectMultiple: 'Seleziona le tue scelte',
        nothing: 'Niente',
        filterTeams: 'Filtrare squadre',
        filterLeagues: 'Filtrare leghe',
        filterMonths: 'Filtrare mesi',
        findTeam: 'Trova una squadra',
        leagueSurveilled: 'Lega/Leghe da visualizzare',
        score: 'Punteggio finale',
        favorites: 'PREFERITI',
        followLive: 'Segui in diretta',
        scoreView: 'Mostra punteggi',
        localizeArena: "Localizza l'arena",
        downloadICS: 'File .ics',
        gameDetails: 'Dettagli del gioco',
        events: 'Eventi',
        final: 'Finale',
        standings: 'Classifica',
        currentScore: 'Punteggio attuale',
        showHidePreviousScores: 'Mostra/Nascondi punteggi precedenti',
        postponedGame: 'Gioco posticipato',
        signInWithGoogle: 'Accedi con Google',
        signOut: 'Esci',
        authentication: 'Identificarsi',
        continueWithEmail: "Continua con l'e-mail",
        forgotPassword: 'Password dimenticata?',
        loggedInAs: 'Connesso come:',
      };
      break;
    case 'ja':
      translation = {
        all: 'すべて',
        gamesOfDay: 'その日のゲーム',
        remainingGames: '残りのゲーム',
        focusTeam: 'チームをフォロー',
        calendars: 'アジェンダ',
        connection: '接続',
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
        select: 'あなたの選択を選択してください',
        selectMultiple: '複数の選択肢を選択',
        nothing: 'なし',
        filterTeams: 'チームをフィルター',
        filterLeagues: 'リーグをフィルター',
        filterMonths: '月をフィルター',
        findTeam: 'チームを探す',
        leagueSurveilled: '表示するリーグ',
        score: '最終スコア',
        favorites: 'お気に入り',
        followLive: 'ライブをフォロー',
        scoreView: 'スコアを表示',
        localizeArena: 'アリーナの位置を特定',
        downloadICS: 'ICSファイル',
        gameDetails: 'ゲームの詳細',
        events: 'イベント',
        final: '最終',
        standings: 'スタンディング',
        currentScore: '現在のスコア',
        showHidePreviousScores: '前のスコアを表示/非表示',
        postponedGame: '試合が延期されました',
        signInWithGoogle: 'Googleでサインイン',
        signOut: 'サインアウト',
        authentication: '本人確認を行ってください',
        continueWithEmail: 'メールで続ける',
        forgotPassword: 'パスワードをお忘れですか？',
        loggedInAs: 'ログイン：',
      };
      break;
    case 'ko':
      translation = {
        all: '전체',
        gamesOfDay: '그날의 게임',
        remainingGames: '남은 게임',
        focusTeam: '팀 팔로우',
        calendars: '아젠다',
        connection: '연결',
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
        select: '선택하세요',
        selectMultiple: '여러 항목을 선택하세요',
        nothing: '없음',
        filterTeams: '팀 필터링',
        filterLeagues: '리그 필터링',
        filterMonths: '월 필터링',
        findTeam: '팀 찾기',
        leagueSurveilled: '표시할 리그',
        score: '최종 점수',
        favorites: '즐겨찾기',
        followLive: '라이브 팔로우',
        scoreView: '점수 보기',
        localizeArena: '아레나 위치 지정',
        downloadICS: 'ICS 파일',
        gameDetails: '게임 세부 정보',
        events: '이벤트',
        final: '최종',
        standings: '순위',
        currentScore: '현재 점수',
        showHidePreviousScores: '이전 점수 표시/숨기기',
        postponedGame: '경기 연기됨',
        signInWithGoogle: 'Google로 로그인',
        signOut: '로그아웃',
        authentication: '본인 확인',
        continueWithEmail: '이메일로 계속하기',
        forgotPassword: '비밀번호를 잊으셨나요?',
        loggedInAs: '로그인 계정:',
      };
      break;
    case 'nl':
      translation = {
        all: 'ALLE',
        gamesOfDay: 'Spelkalender',
        remainingGames: 'Resterende wedstrijden',
        focusTeam: 'Volg een team',
        calendars: 'Agenda',
        connection: 'Verbinding',
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
        select: 'Selecteer uw keuze',
        selectMultiple: 'Selecteer uw keuzes',
        nothing: 'Niets',
        filterTeams: 'Teams filteren',
        filterLeagues: 'Competities filteren',
        filterMonths: 'Maanden filteren',
        findTeam: 'Zoek een team',
        leagueSurveilled: 'Weer te geven competitie(s)',
        score: 'Eindstand',
        favorites: 'FAVORIETEN',
        followLive: 'Volg live',
        scoreView: 'Scores weergeven',
        localizeArena: 'Arena lokaliseren',
        downloadICS: 'ICS-bestand',
        gameDetails: 'Spel details',
        events: 'Evenementen',
        final: 'Eind',
        standings: 'Standings',
        currentScore: 'Huidige score',
        showHidePreviousScores: 'Vorige scores tonen/verbergen',
        postponedGame: 'Spiel verschoben',
        signInWithGoogle: 'Iniciar sesión con Google',
        signOut: 'Uitloggen',
        authentication: 'Identificeer uzelf',
        continueWithEmail: 'Doorgaan met e-mail',
        forgotPassword: 'Wachtwoord vergeten?',
        loggedInAs: 'Ingelogd als:',
      };
      break;
    case 'pt':
      translation = {
        all: 'TODOS',
        gamesOfDay: 'Jogos do dia',
        remainingGames: 'Jogos restantes',
        focusTeam: 'Siga um time',
        calendars: 'Agenda',
        connection: 'Conexão',
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
        select: 'Selecione sua opção',
        selectMultiple: 'Selecione suas opções',
        nothing: 'Nada',
        filterTeams: 'Filtrar times',
        filterLeagues: 'Filtrar ligas',
        filterMonths: 'Filtrar meses',
        findTeam: 'Encontrar um time',
        leagueSurveilled: 'Liga(s) a exibir',
        score: 'Placar final',
        favorites: 'FAVORITOS',
        followLive: 'Seguir ao vivo',
        scoreView: 'Mostrar placares',
        localizeArena: 'Localizar estádio',
        downloadICS: 'Arquivo .ics',
        gameDetails: 'Detalhes do jogo',
        events: 'Eventos',
        final: 'Final',
        standings: 'Classificação',
        currentScore: 'Placar atual',
        showHidePreviousScores: 'Mostrar/Ocultar placar anterior',
        postponedGame: 'Jogo adiado',
        signInWithGoogle: 'Iniciar sesión con Google',
        signOut: 'Sair',
        authentication: 'Identifique-se',
        continueWithEmail: 'Continuar com e-mail',
        forgotPassword: 'Esqueceu a senha?',
        loggedInAs: 'Conectado como:',
      };
      break;
    case 'ru':
      translation = {
        all: 'ВСЕ',
        gamesOfDay: 'Игры дня',
        remainingGames: 'Оставшиеся игры',
        focusTeam: 'Следить за командой',
        calendars: 'Агенда',
        connection: 'Подключение',
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
        select: 'Выберите свой вариант',
        selectMultiple: 'Выберите несколько вариантов',
        nothing: 'Ничего',
        filterTeams: 'Фильтровать команды',
        filterLeagues: 'Фильтровать лиги',
        filterMonths: 'Фильтровать месяцы',
        findTeam: 'Найти команду',
        leagueSurveilled: 'Лиги для отображения',
        score: 'Итоговый счет',
        favorites: 'ИЗБРАННОЕ',
        followLive: 'Следить в прямом эфире',
        scoreView: 'Показать результаты',
        localizeArena: 'Локализовать стадион',
        downloadICS: 'Файл .ics',
        gameDetails: 'Детали игры',
        events: 'События',
        final: 'Финал',
        standings: 'Таблица',
        currentScore: 'Текущий счет',
        showHidePreviousScores: 'Показать/скрыть предыдущие счета',
        postponedGame: 'Игра отложена',
        signInWithGoogle: 'Войти с помощью Google',
        signOut: 'Выйти',
        authentication: 'Идентифицируйте себя',
        continueWithEmail: 'Продолжить через электронную почту',
        forgotPassword: 'Забыли пароль?',
        loggedInAs: 'Вы вошли как:',
      };
      break;
    case 'zh':
      translation = {
        all: '所有',
        gamesOfDay: '当天的比赛',
        remainingGames: '剩余比赛',
        focusTeam: '关注一个团队',
        calendars: '议程',
        connection: '连接',
        noResults: '没有结果',
        inProgress: '进行中',
        noOptionsAvailable: '没有可用选项',
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
        select: '选择你的选择',
        selectMultiple: '选择多个选项',
        nothing: '无',
        filterTeams: '筛选球队',
        filterLeagues: '筛选联赛',
        filterMonths: '筛选月份',
        findTeam: '查找球队',
        leagueSurveilled: '要显示的联赛',
        score: '最终得分',
        favorites: '收藏',
        followLive: '关注直播',
        scoreView: '显示比分',
        localizeArena: '本地化球馆',
        downloadICS: 'ICS文件',
        gameDetails: '比赛详情',
        events: '事件',
        final: '最终',
        standings: '排名',
        currentScore: '当前得分',
        showHidePreviousScores: '显示/隐藏之前的比分',
        postponedGame: '比赛推迟',
        signInWithGoogle: '使用Google登录',
        signOut: '退出登录',
        authentication: '身份验证',
        continueWithEmail: '使用电子邮件继续',
        forgotPassword: '忘记密码？',
        loggedInAs: '登录身份：',
      };
      break;
    default:
      translation = {
        all: 'ALL',
        gamesOfDay: 'Games of the day',
        remainingGames: 'Remaining games',
        focusTeam: 'Follow a team',
        calendars: 'Agenda',
        connection: 'Connection',
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
        select: 'Select your choice',
        selectMultiple: 'Select your choices',
        nothing: 'Nothing',
        filterTeams: 'Filter teams',
        filterLeagues: 'Filter leagues',
        filterMonths: 'Filter months',
        findTeam: 'Find a Team',
        leagueSurveilled: 'League(s) to display',
        score: 'Final Score',
        favorites: 'FAVORITES',
        followLive: 'Follow Live',
        scoreView: 'Show scores',
        localizeArena: 'Localize Arena',
        downloadICS: 'ICS File',
        gameDetails: 'Game Details',
        events: 'Events',
        final: 'Final',
        standings: 'Standings',
        currentScore: 'Current Score',
        showHidePreviousScores: 'Show/Hide Previous Scores',
        postponedGame: 'Postponed Game',
        signInWithGoogle: 'Sign in with Google',
        signOut: 'Sign out',
        authentication: 'Please sign in',
        continueWithEmail: 'Continue with Email',
        forgotPassword: 'Forgot Password?',
        loggedInAs: 'Logged in as:',
      };
      break;
  }
  return translation[word] ?? '';
};
