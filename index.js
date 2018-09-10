const { GraphQLClient } = require('graphql-request');
const { convertArrayToCSV } = require('convert-array-to-csv');
const fs = require('fs');


const client = new GraphQLClient('https://api.github.com/graphql', {
  headers: {
    Authorization: 'Bearer 809bfd6fbe69ebe801978c892363616de9c2bd8f',
  },
});

const firstQuery = `
  query {
    repository(owner: "facebook" name: "react") {
      stargazers(first: 100) {
        edges {
          node {
            id,
            name,
            location,
            bio,
            company,
            followers(first: 1) {
              totalCount
            },
            organizations {
              totalCount
            },
            repositories(first: 1) {
              totalCount
            },
            starredRepositories {
              totalCount
            }
          }
          cursor
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`;

const nextQuery = `
  query($after: String) {
    repository(owner: "facebook" name: "react") {
      stargazers(first: 100 after: $after) {
        edges {
          node {
            id,
            name,
            location,
            bio,
            company,
            followers(first: 1) {
              totalCount
            },
            organizations {
              totalCount
            },
            repositories(first: 1) {
              totalCount
            },
            starredRepositories {
              totalCount
            }
          }
          cursor
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`;

let stargazers = [];

function cleanFields(data) {
  let cleanBio = data.bio;
  let cleanName = data.name;
  let cleanLocation = data.location;
  let cleanCompany = data.company;
  if (data.bio !== null) {
    cleanBio = cleanBio.replace(/(\r\n\t|\n|\r\t)/gm,"");
    cleanBio = cleanBio.replace(/,/gm, " ");
  }
  if (data.name !== null) {
    cleanName = cleanName.replace(/,/gm, " ");
  }
  if (data.location !== null) {
    cleanLocation = cleanLocation.replace(/,/gm, " ");
  }
  if (data.company !== null) {
    cleanCompany = cleanCompany.replace(/,/gm, " ");
  }

  return { cleanBio, cleanName, cleanLocation, cleanCompany };
}

function appendToCsv(data) {
  let text = '';
  for (var i = 0; i < data.length; i++) {
    console.log('data[i].node');
    console.log(data[i].node);
    const cleaned = cleanFields(data[i].node);
    text += `${data[i].node.id},${cleaned.cleanName},${cleaned.cleanLocation},${cleaned.cleanBio},${cleaned.cleanCompany},${data[i].node.organizations.totalCount},`;
    text += `${data[i].node.followers.totalCount},${data[i].node.repositories.totalCount},${data[i].node.starredRepositories.totalCount}\n`;
  }

  fs.appendFile('react-stargazers-detailed.csv', text, (err) => {
    if (err) throw err;

    console.log(`Wrote ${text}`);
  });
}

function getNext(result) {
  console.log(result);
  console.log(result.repository.stargazers.pageInfo);

  appendToCsv(result.repository.stargazers.edges);

  if (result.repository.stargazers.pageInfo.hasNextPage) {
    let lastId = result.repository.stargazers.pageInfo.endCursor;

    const variables = {
      after: lastId,
    };

    client.request(nextQuery, variables).then(result => {
      getNext(result);
    });

  } else {
    writeCsv();
  }
}

fs.writeFile('react-stargazers-detailed.csv', 'id,name,location,bio,company,organizations,followers,repositories,starredRepositories\n', (err) => {
  if (err) throw err;
  console.log('wrote header');
});

client.request(firstQuery).then(result => {
  getNext(result);
});
