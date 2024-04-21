// Menambah Dependencies
const {
  default: makeWASocket,
  DisconnectReason,
  useSingleFileAuthState,
} = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState("./login.json");

//Bagian koding chat GPT
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  // apiKey: "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",
});
const openai = new OpenAIApi(configuration);

//fungsi OpenAI chatgpt untuk mendapatkan respon
async function generateResponse(text) {
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: text,
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  });
  return response.data.choices[0].text;
}

// Fungsi Utama El WA
async function connectToWhatsApp() {
  //Buat sebuah koneksi baru ke WA
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    defaultQuertTimeoutMs: undefined,
  });

  //Fungsi untuk Cek Koneksi Update
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error = Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "Koneksi terputus karena",
        lastDisconnect.error,
        ", hubungkan kembali!",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("Koneksi tersambung banh!");
    }
  });
  sock.ev.on("creds.update", saveState);

  //Fungsi Untuk Cek Pesan Masuk
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log("Tipe Pesan: ", type);
    console.log(messages);
    if (type === "notify" && !messages[0].key.fromMe) {
      try {
        //Dapatkan nomor pengirim dan isi pesan
        const senderNumber = messages[0].key.remoteJid;
        let incomingMessages = messages[0].message.conversation;
        if (incomingMessages === "") {
          incomingMessages = messages[0].message.extendedTextMessage.text;
        }
        incomingMessages = incomingMessages.toLowerCase();

        //Dapatkan info pesan dari grup atau Bukan
        //Dan pesan menyebut bot atau tidak
        const isMessageFromGroup = senderNumber.includes("@g.us");
        const isMessageMentionBot = incomingMessages.includes("@6281396173964");

        //Tampilkan nomer pengirim dan isi pesan
        console.log("Nomer Pengirim: ", senderNumber);
        console.log("Isi Pesan", incomingMessages);

        //Tampilkan status pesan dari grup atau bukan
        //Tampilkan status pesan menyebut bot atau tidak
        console.log("Apakah Pesan dari Grup? ", isMessageFromGroup);
        console.log("Apakah Pesan Menyebut Bot? ", isMessageMentionBot);

        //kalau nanya langsung ke bot
        if (!isMessageFromGroup) {
          //Jika ada yang mengirim pesan halo
          if (incomingMessages === "halo") {
            await sock.sendMessage(
              senderNumber,
              { text: "El.disini" },
              { quoted: messages[1] },
              2000
            );
          }

          //Jika ada yang mengirim pesan mengandung kata siapa
          if (
            incomingMessages.includes("siapa") &&
            incomingMessages.includes("kamu")
          ) {
            await sock.sendMessage(
              senderNumber,
              { text: "Saya El bot dan saya adalah buatan Elroy Duha" },
              { quoted: messages[0] },
              2000
            );
          } else {
            async function main() {
              const result = await generateResponse(incomingMessages);
              console.log(result);
              await sock.sendMessage(
                senderNumber,
                { text: result + "\n\n" },
                { quoted: messages[0] },
                2000
              );
            }
            main();
          }
        }

        //kalau misalkan nanya via grup
        if (isMessageFromGroup && isMessageMentionBot) {
          //Jika ada yang mengirim pesan mengandung kata siapa
          if (
            incomingMessages.includes("siapa") &&
            incomingMessages.includes("kamu")
          ) {
            await sock.sendMessage(
              senderNumber,
              { text: "Saya El bot dan saya adalah buatan Elroy Duha" },
              { quoted: messages[0] },
              2000
            );
          } else {
            async function main() {
              const result = await generateResponse(incomingMessages);
              console.log(result);
              await sock.sendMessage(
                senderNumber,
                { text: result + "\n\n" },
                { quoted: messages[0] },
                2000
              );
            }
            main();
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  });
}

connectToWhatsApp().catch((err) => {
  console.log("Ada Error: " + err);
});
