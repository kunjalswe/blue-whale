const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tictactoe")
    .setDescription("Play Tic-Tac-Toe with the bot or another user")
    .addUserOption(option => option.setName('opponent').setDescription('User to challenge (leave blank to play against bot)').setRequired(false)),
  async execute(interaction) {
    const opponent = interaction.options.getUser('opponent');
    
    if (opponent && opponent.id === interaction.user.id) {
      return interaction.reply({ content: "❌ You cannot play against yourself!", ephemeral: true });
    }

    const players = {  
      X: interaction.user,  
      O: opponent
    };  
    let board = Array(9).fill(null);  
    let turn = "X";
    let botThinking = false;  

    const generateButtons = () => {  
      return [0, 1, 2].map(r => {  
        const row = new ActionRowBuilder();  
        for (let c = 0; c < 3; c++) {  
          const i = r * 3 + c;  
          row.addComponents(  
            new ButtonBuilder()  
              .setCustomId(i.toString())  
              .setLabel(board[i] ?? "⬜")  
              .setStyle(ButtonStyle.Secondary)  
              .setDisabled(board[i] !== null || botThinking)  
          );  
        }  
        return row;  
      });  
    };  

    const checkWin = (symbol) => {  
      const wins = [  
        [0,1,2],[3,4,5],[6,7,8],  
        [0,3,6],[1,4,7],[2,5,8],  
        [0,4,8],[2,4,6]  
      ];  
      return wins.some(p => p.every(i => board[i] === symbol));  
    };  

    const botMove = () => {  
      const empty = board.map((v,i)=>v===null?i:null).filter(v=>v!==null);  
      const move = empty[Math.floor(Math.random() * empty.length)];  
      board[move] = "⭕";  
    };  

    const embed = new EmbedBuilder()  
      .setTitle("🎮 Tic-Tac-Toe")  
      .setDescription(`${players.X.username}'s turn (❌)`)  
      .setColor(0x5865F2);  

    const gameMessage = await interaction.reply({  
      embeds: [embed],  
      components: generateButtons(),
      fetchReply: true
    });  

    const collector = gameMessage.createMessageComponentCollector({  
      time: 10 * 60 * 1000  
    });  

    const update = async () => {  
      await interaction.editReply({  
        embeds: [embed],  
        components: generateButtons()  
      }).catch(() => {});  
    };  

    collector.on("collect", async i => {  
      if (botThinking) return;  
      const currentPlayer = players[turn];  
      if (currentPlayer && i.user.id !== currentPlayer.id) {  
        return i.reply({  
          content: "❌ Not your turn!",  
          ephemeral: true  
        });  
      }  
      await i.deferUpdate().catch(() => {});  
      const index = Number(i.customId);  
      if (board[index]) return;  
      board[index] = turn === "X" ? "❌" : "⭕";  

      if (checkWin(board[index])) {  
        embed.setDescription(`🏆 ${currentPlayer.username} wins!`);  
        await update();  
        return collector.stop();  
      }  

      if (!board.includes(null)) {  
        embed.setDescription("🤝 It's a draw!");  
        await update();  
        return collector.stop();  
      }  

      turn = turn === "X" ? "O" : "X";  

      if (!players.O && turn === "O") {  
        botThinking = true;  
        embed.setDescription("🤖 Bot is thinking...");  
        await update();  

        setTimeout(async () => {  
          botMove();  
          if (checkWin("⭕")) {  
            embed.setDescription("🤖 Bot wins!");  
            botThinking = false;  
            await update();  
            return collector.stop();  
          }  
          if (!board.includes(null)) {  
            embed.setDescription("🤝 It's a draw!");  
            botThinking = false;  
            await update();  
            return collector.stop();  
          }  
          turn = "X";  
          botThinking = false;  
          embed.setDescription(`${players.X.username}'s turn (❌)`);  
          await update();  
        }, 1200);  
      } else {  
        embed.setDescription(`${players[turn].username}'s turn (${turn === "X" ? "❌" : "⭕"})`);  
        await update();  
      }  
    });  

    collector.on("end", async () => {  
      const disabled = generateButtons().map(row =>  
        new ActionRowBuilder().addComponents(  
          row.components.map(b => ButtonBuilder.from(b).setDisabled(true))  
        )  
      );  
      await interaction.editReply({ components: disabled }).catch(() => {});  
    });
  }
};