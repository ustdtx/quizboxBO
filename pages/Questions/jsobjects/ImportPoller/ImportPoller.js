export default {
  poll() {
    const intervalId = setInterval(async () => {
      try {
        const res = await Api_Status.run();
        const s = res.data; 

        console.log("IMPORT STATUS", s);

        showAlert(
          `Progress ${s.progress}% | ${s.successfulRows}/${s.totalRows}`,
          "info"
        );

        if (["completed","partially_completed","failed"].includes(s.status)) {
          clearInterval(intervalId);
          showAlert(`Final status: ${s.status}`, "success");
        }
      } catch (e) {
        console.error(e);
        clearInterval(intervalId);
        showAlert("Polling failed", "error");
      }
    }, 2000);
  }
}

