import fs from 'fs';
import json2csv from 'json2csv';
import { findIndex, maxBy, map, reduce, isArray } from 'lodash';

export const toTitleCase = (str) => {
  const split = str.split('-');
  const capitalize = (str) => {
    return str.replace(/\w\S*/g, (txt) => (
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    ));
  };
  return split.map(capitalize).join('-');
}

export const writeToCsv = (data, fields, destFile) => {
    let csv = json2csv({
      data: data,
      fileds: fields
    });

    fs.writeFile(destFile, csv, (err) => {
      if (err) {
        return console.log(`Writing "${destFile}" failed.`);
      }
      console.log(`\nNew csv generated at "${destFile}"`);
    })
}

export const getCoord = point => `${point.lat},${point.lng}`;

export const partyColors = {
  none: '#363636', // Will be returned when all votes equal 0
  psd: '#de1313',
  usr: '#01a0e4',
  pnl: '#e6c835',
  udmr: '#63ab26',
  alde: '#095685',
  pmp: '#e7981c',
  pru: '#ff00ff',
  altele: '#e1e1e1'
};

export const parties = ['psd', 'usr', 'pnl', 'udmr', 'alde', 'pmp', 'pru', 'altele'];

export const sum = function(a, b) {
	a = isNaN(a) ? 0 : a;
	b = isNaN(b) ? 0 : b;
	return a + b
};

// Calculates the total number of votes / party from a number of points
// TODO: Memoize
export const calculatePointsVotes = function (points) {
  let cdepPartyVotes = {}, senatPartyVotes = {};
  parties.map(key => {
    cdepPartyVotes[key] = 0;
	senatPartyVotes[key] = 0;
  });

  points.forEach(function(point){
	  parties.forEach(function(partyName){
		cdepPartyVotes[partyName] += point.votes.cdep[partyName] ? parseInt(point.votes.cdep[partyName]) : 0;
		senatPartyVotes[partyName] += point.votes.senat[partyName] ? parseInt(point.votes.senat[partyName]) : 0;
	  });
  });

	return {
		cdep: cdepPartyVotes,
		senat: senatPartyVotes
	};

  // return points.reduce((votesArray, point, i) => {
  //   Object.keys(votesArray).map(party => {
  //     votesArray[party] += point.votes[party] ? parseInt(point.votes[party]) : 0;
  //   });
  //   return votesArray;
  // }, partyVotes);
}

export const calculateReportedPollingStations = points => {
  return points.filter(point => {
    return reduce(point.votes.cdep, sum, 0) + reduce(point.votes.senat, sum, 0) > 0;
  }).length;
}

// Returns the winner party key
export const getWinner = (points) => {
  let votes = calculatePointsVotes(points);
  let totalVotesByParty = {};
  let totalVotes = 0;
  parties.map(key => { totalVotesByParty[key] = 0; });

  Object.keys(votes.cdep).forEach(function(partyName){
	  totalVotes += votes.cdep[partyName];
	  totalVotesByParty[partyName] += votes.cdep[partyName];
  });
  Object.keys(votes.senat).forEach(function(partyName){
	  totalVotes += votes.senat[partyName];
	  totalVotesByParty[partyName] += votes.senat[partyName];
  });

  // no votes, no winner
  if (totalVotes === 0 ) {
	  return 'none';
  }

  let winner = maxBy(Object.keys(totalVotesByParty), o => totalVotesByParty[o]);
  return winner;
}

export const getWinnerColor = points => partyColors[getWinner(points)];

// Adds an array of point ids to the first point in the array that has an
// identical address. It is assumed that using the first point name will suffice.
export const getPointsByAddress = points => {
  // Group points by address
  let pointsByAddress = [];
  let votes, reportedStations;
  points.forEach(point => {
    let existingIndex = findIndex(
      pointsByAddress,
      addrPoint => addrPoint.address === point.address
    );
    if (existingIndex === -1) {
      pointsByAddress.push({
        ...point,
        ids: [point.id]
      });
    } else {
      votes = calculatePointsVotes([
        pointsByAddress[existingIndex],
        point
      ]);

      reportedStations = calculateReportedPollingStations([
        pointsByAddress[existingIndex],
        point
      ]);

      pointsByAddress[existingIndex] = {
        ...pointsByAddress[existingIndex],
        votes,
        reportedStations,
        ids: [...pointsByAddress[existingIndex].ids, point.id]
      };
    };
  });

  return pointsByAddress;
}

export const getPointsByCity = (points) => {
  // Group points by city
  let pointsByCity = [];
  let votes, reportedStations;
  let isStationReported = point => (reduce(point.votes.cdep, sum, 0) + reduce(point.votes.senat, sum, 0) > 0);
  points.forEach(point => {

    let existingIndex = findIndex(
      pointsByCity,
      addrPoint => addrPoint.city === point.city
    );

    if (existingIndex === -1) {
      pointsByCity.push({
        ...point,
        reportedStations: isStationReported(point) ? 1 : 0,
        ids: [point.id]
      });
    } else {
      votes = calculatePointsVotes([
        pointsByCity[existingIndex],
        point
      ]);

      if (reduce(point.votes.cdep, sum, 0) + reduce(point.votes.senat, sum, 0) > 0) {
        pointsByCity[existingIndex].reportedStations++;
      }

      pointsByCity[existingIndex] = {
        ...pointsByCity[existingIndex],
        votes,
        ids: [...pointsByCity[existingIndex].ids, point.id]
      };
    };
  });

  return pointsByCity;

}

export const counties = {
  "MARAMURES": "MM",
  "SALAJ": "SJ",
  "SATU MARE": "SM",
  "ARGES": "AG",
  "CALARASI": "CL",
  "DAMBOVITA": "DB",
  "GIURGIU": "GR",
  "IALOMITA": "IL",
  "PRAHOVA": "PH",
  "TELEORMAN": "TR",
  "BRAILA": "BR",
  "BACAU": "BC",
  "CONSTANTA": "CT",
  "GALATI": "GL",
  "ILFOV": "IF",
  "ALBA": "AB",
  "BRASOV": "BV",
  "TULCEA": "TL",
  "VRANCEA": "VN",
  "DOLJ": "DJ",
  "GORJ": "GJ",
  "MEHEDINTI": "MH",
  "OLT": "OT",
  "VALCEA": "VL",
  "ARAD": "AR",
  "CARAS-SEVERIN": "CS",
  "HUNEDOARA": "HD",
  "TIMIS": "TM",
  "COVASNA": "CV",
  "HARGHITA": "HR",
  "MURES": "MS",
  "SIBIU": "SB",
  "BOTOSANI": "BT",
  "IASI": "IS",
  "NEAMT": "NT",
  "SUCEAVA": "SV",
  "BIHOR": "BH",
  "BUCURESTI": "B",
  "VASLUI": "VS",
  "BISTRITA-NASAUD": "BN",
  "CLUJ": "CJ",
  "BUZAU": "BZ"
};
