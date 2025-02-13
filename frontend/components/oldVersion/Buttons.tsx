// import { useEffect, useState } from "react";
// import lastAllTeamsMLB from "../../../../../temporaryData/allTeamsMLB.json";
// import lastAllTeamsNBA from "../../../../../temporaryData/allTeamsNBA.json";
// import lastAllTeamsNFL from "../../../../../temporaryData/allTeamsNFL.json";
// import lastAllTeamsNHL from "../../../../../temporaryData/allTeamsNHL.json";
// import { gamesSelected, teamSelected } from "../../../../store/store";

// export default function RemoveButton() {
//   const [isGamesSelected, setIsGamesSelected] = useState(false);
//   const [teamsSelected, setTeamsSelected] = useState(teamSelected.get());
//   const [disabledRemove, setDisabledRemove] = useState(false);
//   const [disabledAdd, setDisabledAdd] = useState(false);

//   const allTeams = [
//     ...lastAllTeamsNHL.activeTeams,
//     ...lastAllTeamsNFL.activeTeams,
//     ...lastAllTeamsNBA.activeTeams,
//     ...lastAllTeamsMLB.activeTeams,
//   ];

//   useEffect(() => {
//     gamesSelected.subscribe((value) => {
//       setIsGamesSelected(!!value.length);
//     });

//     teamSelected.subscribe(async (value) => {
//       setTeamsSelected([...value]);
//       const minColumns = 2;
//       let maxColumns = 8;
//       if (window?.innerWidth <= 768) {
//         maxColumns = 6;
//       }
//       setDisabledRemove(value.length <= minColumns);
//       setDisabledAdd(value.length >= maxColumns);
//     });
//   }, []);

//   const removeAllGames = () => {
//     localStorage.removeItem("gameSelected");
//     gamesSelected.set([]);
//   };

//   const removeLastColumn = () => {
//     const removeLastTeam = teamsSelected.slice(0, -1);
//     teamSelected.set(removeLastTeam);
//     localStorage.setItem("teamsSelected", removeLastTeam.join(";"));
//   };

//   const addAColumn = () => {
//     const availableTeams = allTeams.filter(
//       (team) => !teamsSelected.includes(team),
//     );
//     const randomTeam =
//       availableTeams[Math.floor(Math.random() * availableTeams.length)];
//     const moreTeams = [...teamsSelected, randomTeam.uniqueId];
//     teamSelected.set(moreTeams);
//     localStorage.setItem("teamsSelected", moreTeams.join(";"));
//   };

//   return (
//     <div style={{ display: "flex", justifyContent: "space-between" }}>
//       <button
//         disabled={!isGamesSelected}
//         onClick={removeAllGames}
//         style={{
//           flex: 1,
//           margin: "0 10px",
//           backgroundColor: "#ff0000",
//           color: "#ffffff",
//           borderRadius: "5px",
//           padding: "10px 20px",
//           cursor: "pointer",
//           fontSize: "16px",
//           opacity: !isGamesSelected ? 0.5 : 1,
//         }}
//       >
//         <div>
//           <i
//             className="fa fa-trash"
//             style={{ color: "#ffffff", padding: "0.1rem" }}
//           ></i>
//           <i
//             className="fa fa-list"
//             style={{ color: "#ffffff", padding: "0.1rem" }}
//           ></i>
//         </div>
//       </button>

//       <button
//         disabled={disabledAdd}
//         onClick={addAColumn}
//         style={{
//           flex: 1,
//           margin: "0 10px",
//           backgroundColor: "#ffffff",
//           color: "#000000",
//           borderRadius: "5px",
//           padding: "10px 20px",
//           cursor: "pointer",
//           fontSize: "16px",
//           opacity: disabledAdd ? 0.5 : 1,
//           border: "1px solid #000000",
//         }}
//       >
//         <div>
//           <i
//             className="fa fa-plus"
//             style={{ color: "#000000", padding: "0.1rem" }}
//           ></i>
//           <i
//             className="fa fa-columns"
//             style={{ color: "#000000", padding: "0.1rem" }}
//           ></i>
//         </div>
//       </button>

//       <button
//         disabled={disabledRemove}
//         onClick={removeLastColumn}
//         style={{
//           flex: 1,
//           margin: "0 10px",
//           backgroundColor: "#000000",
//           color: "#ffffff",
//           borderRadius: "5px",
//           padding: "10px 20px",
//           cursor: "pointer",
//           fontSize: "16px",
//           opacity: disabledRemove ? 0.5 : 1,
//           border: "1px solid #ffffff",
//         }}
//       >
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <i
//             className="fa fa-minus"
//             style={{ color: "#ffffff", padding: "0.1rem" }}
//           ></i>
//           <i
//             className="fa fa-columns"
//             style={{ color: "#ffffff", padding: "0.1rem" }}
//           ></i>
//         </div>
//       </button>
//     </div>
//   );
// }
