generateBtn.addEventListener("click", async () => {
  const songUrlVal = document.querySelector("#songUrl").value;

  if (!songUrlVal) {
    errorMsg.textContent = `Please enter a Spotify song URL!`;
    songUrl.style.cssText = "outline: 2px red solid";
    return;
  }

  try {
    const response = await fetch("/api/song", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ songUrlVal }),
    });

    const data = await response.json();

    if (response.ok) {
      cover.src = data.cover || "default-cover.jpg";
      title.textContent = data.title || "[Track Title]";
      artists.textContent = data.artists.join(", ") || "[Artist Name]";
      document.documentElement.style.setProperty("--card-bg", data.color);
      bgColor.value = data.color;
      googleSearch.href = data.googleSearch || "#";
      lyricsBody.innerHTML = data.lyrics;
      googleSearch.style.cssText = "color: white";
      errorMsg.textContent = ``;
      songUrl.style.cssText = "";

      lyricsBody.querySelectorAll("span").forEach((line) => {
        line.addEventListener("click", () => {
          line.classList.toggle("selectedLine");
          lyrics.textContent = "";
          for (let i = 0; i < lyricsBody.querySelectorAll(".selectedLine").length; i++) {
            lyrics.innerHTML += `${lyricsBody.querySelectorAll(".selectedLine")[i].textContent}`;
            if (i != lyricsBody.querySelectorAll(".selectedLine").length - 1) lyrics.innerHTML += `<br>`;
          }
          if (lyrics.textContent === "") lyrics.textContent = "_";
        });
      });
    } else {
      errorMsg.textContent = `Please enter a valid Spotify song URL!`;
      songUrl.style.cssText = "outline: 2px red solid";
    }
  } catch (error) {
    alert("An error occurred");
  }
});

let editList = [title, artists, lyrics];

editList.forEach((e) => {
  e.addEventListener("click", () => {
    e.setAttribute("contenteditable", "true");
    e.focus();
  });

  e.addEventListener("blur", () => {
    if (e.textContent == "") e.textContent = `_`;
    e.removeAttribute("contenteditable");
  });
});

textColor.addEventListener("input", () => {
  document.documentElement.style.setProperty("--card-text", textColor.value);
});

bgColor.addEventListener("input", () => {
  document.documentElement.style.setProperty("--card-bg", bgColor.value);
});

downloadBtn.addEventListener("click", () => {
  html2canvas(lyricsCard, { scale: 1080 / lyricsCard.clientWidth, useCORS: true, backgroundColor: null }).then((canvas) => {
    const ctx = canvas.getContext("2d");

    const largerCanvas = document.createElement("canvas");
    largerCanvas.width = canvas.width + 2 * 200;
    largerCanvas.height = canvas.height + 2 * 300;
    const largerCtx = largerCanvas.getContext("2d");

    largerCtx.fillStyle = bgColor.value;
    largerCtx.fillRect(0, 0, largerCanvas.width, largerCanvas.height);

    const gradient = largerCtx.createLinearGradient(0, 0, largerCanvas.width, largerCanvas.height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.2)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    largerCtx.fillStyle = gradient;
    largerCtx.fillRect(0, 0, largerCanvas.width, largerCanvas.height);

    const xOffset = (largerCanvas.width - canvas.width) / 2;
    const yOffset = (largerCanvas.height - canvas.height) / 2;

    largerCtx.drawImage(canvas, xOffset, yOffset);

    const dataURL = largerCanvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${parseInt(Date.now() / 100)}.png`;

    setTimeout(() => {
      link.click();
    }, 100);
  });
});

lyrics.addEventListener("paste", function (e) {
  e.preventDefault();
  const lyricsText = (e.clipboardData || window.clipboardData).getData("text");
  document.execCommand("insertText", false, lyricsText);
});
