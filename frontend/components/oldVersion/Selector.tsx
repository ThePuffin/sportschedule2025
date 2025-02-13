// import { Component } from "react";
// import Select from "react-select";
// import type { TeamType } from "../../../../interface/team.ts";
// import { teamSelected } from "../../../../store/store.js";

// export default class Selector extends Component<any, any> {
//   constructor(props) {
//     super(props);
//     this.state = {
//       availableTeams: [],
//       teamsSelectedIds: props.teamsSelectedIds,
//       activeTeams: props.activeTeams,
//       i: props.i,
//       teamSelectedId: props.teamSelectedId,
//       label: "",
//     };
//   }

//   defineAvailableTeams(teamsSelectedIds) {
//     const { activeTeams, teamSelectedId } = this.state;
//     const teamId = teamSelectedId;
//     const selectedTeams =
//       teamsSelectedIds?.filter((team: string) => team !== teamId) ?? [];

//     let selectableTeams = activeTeams
//       .filter((team: TeamType) => !selectedTeams.includes(team.uniqueId))
//       .sort((a: TeamType, b: TeamType) => (a.label > b.label ? 1 : -1));

//     const teamData = activeTeams.find(
//       (team: TeamType) => team.value === teamId,
//     );
//     const { label = "" } = teamData;
//     this.setState(() => ({
//       availableTeams: selectableTeams,
//       label,
//     }));
//   }

//   subscribeTogamesSelected() {
//     const newSubscriptionGames = teamSelected.subscribe((teams) => {
//       this.setState(() => ({
//         teamsSelectedIds: teams,
//       }));
//       this.defineAvailableTeams(teams);
//     });

//     // Store the subscriptionTeam for later cleanup
//     newSubscriptionGames;
//   }

//   async componentDidMount() {
//     const { teamsSelectedIds, i } = this.state;

//     this.subscribeTogamesSelected();
//     let selection = teamSelected.get();

//     if (selection.includes(undefined)) {
//       teamSelected.set(teamsSelectedIds);
//       selection = teamsSelectedIds;
//     }
//     this.setState(() => ({
//       teamSelectedId: selection[i],
//     }));

//     this.defineAvailableTeams(selection);
//   }

//   changeTeam = async (event: { value: string }) => {
//     const newSelection = event.value;
//     let teamsId = [...teamSelected.get()];
//     teamsId[this.state.i] = newSelection;

//     this.setState(() => ({
//       teamSelectedId: newSelection,
//     }));

//     // Save the selected teams in local storage
//     localStorage.setItem("teamsSelected", teamsId.join(";"));

//     teamSelected.set(teamsId);
//   };

//   render() {
//     const { availableTeams, teamSelectedId, label } = this.state;
//     const targetHeight = 65;
//     const customStyles = {
//       control: (base) => ({
//         ...base,
//         minHeight: "initial",
//       }),
//       valueContainer: (base) => ({
//         ...base,
//         height: `${targetHeight - 1 - 1}px`,
//         padding: "0 8px",
//       }),
//       clearIndicator: (base) => ({
//         ...base,
//         padding: `${(targetHeight - 20 - 1 - 1) / 2}px`,
//       }),
//       dropdownIndicator: (base) => ({
//         ...base,
//         padding: `${(targetHeight - 20 - 1 - 1) / 2}px`,
//       }),
//     };

//     return (
//       <div className="App">
//         <Select
//           defaultValue={teamSelectedId}
//           placeholder={label}
//           isSearchable
//           options={availableTeams}
//           onChange={this.changeTeam}
//           styles={customStyles}
//         />
//       </div>
//     );
//   }
// }
