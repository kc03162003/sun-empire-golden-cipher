const project_id = "alba-a3861";
const url = `https://firestore.googleapis.com/v1/projects/${project_id}/databases/(default)/documents/leaderboard?pageSize=1000`;

async function clean() {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const docs = data.documents || [];
    
    const toDelete = docs.filter(doc => {
       const fields = doc.fields || {};
       const time = fields.totalTimeSec ? (fields.totalTimeSec.integerValue || fields.totalTimeSec.doubleValue) : null;
       const name = fields.teamName ? fields.teamName.stringValue : null;
       // time == 0 means either "0" or 0
       return time == 0 || name === "";
    });
    
    console.log("Empty records found: " + toDelete.length);
    for (const doc of toDelete) {
       console.log("Deleting: " + doc.name);
       await fetch(`https://firestore.googleapis.com/v1/${doc.name}`, { method: 'DELETE' });
    }
  } catch (err) {
    console.error(err);
  }
}

clean();
