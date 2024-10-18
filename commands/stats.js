const { SlashCommandBuilder } = require("discord.js");
const characterModel = require("../models/characterSchema");
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');

// Set chart width and height
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#121212' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Returns a distribution chart of all characters in the database based on level or class")
        .addStringOption(option =>
            option.setName('grouping')
                .setDescription('Choose between single level or grouped by 3-level intervals')
                .setRequired(false)
                .addChoices(
                    { name: 'single', value: 'single' },
                    { name: 'grouped', value: 'grouped' }
                ))
        .addStringOption(option =>
            option.setName('analyze')
                .setDescription('Analyze characters by level or class')
                .setRequired(false)
                .addChoices(
                    { name: 'level', value: 'level' },
                    { name: 'class', value: 'class' }
                )),
    async execute(interaction) {
        try {
            // Defer reply to give us time to process the data
            await interaction.deferReply();

            // Get the user's choice for grouping and analysis
            const grouping = interaction.options.getString('grouping') || 'single'; // Default to 'single'
            const analyze = interaction.options.getString('analyze') || 'level'; // Default to 'level'

            // Find all character records
            const characterData = await characterModel.find();
            if (characterData.length === 0) {
                console.log("No character records found in database.");
                await interaction.editReply({
                    content: `There are no characters yet.`,
                    ephemeral: true,
                });
                return;
            }

            let labels, dataCounts, chartTitle;

            if (analyze === 'level') {
                // Analyze by level (existing functionality)
                const levels = characterData.map(char => char.level);
                if (grouping === 'single') {
                    dataCounts = Array(18).fill(0); // Levels 3 to 20 (18 levels)
                    levels.forEach(level => {
                        if (level >= 3 && level <= 20) {
                            dataCounts[level - 3] += 1;
                        }
                    });
                    labels = Array.from({ length: 18 }, (_, i) => i + 3); // Levels 3 to 20
                    chartTitle = 'Character Level Distribution (Single Levels)';
                } else {
                    dataCounts = Array(6).fill(0); // 6 groups: 3-5, 6-8, ..., 18-20
                    levels.forEach(level => {
                        if (level >= 3 && level <= 20) {
                            const groupIndex = Math.floor((level - 3) / 3); // Group levels by three
                            dataCounts[groupIndex] += 1;
                        }
                    });
                    labels = ['3-5', '6-8', '9-11', '12-14', '15-17', '18-20'];
                    chartTitle = 'Character Level Distribution (Grouped by Levels)';
                }
            } else if (analyze === 'class') {
                // Analyze by class
                const classes = characterData.map(char => char.class).filter(cls => cls); // Filter out undefined/null classes
                let correctedClasses = classes.map(classname => (classname.charAt(0).toUpperCase() + classname.slice(1)));
                correctedClasses.sort(); // Sort the classes alphabetically
                const classCounts = {};
            
                correctedClasses.forEach(cls => {
                    classCounts[cls] = (classCounts[cls] || 0) + 1;
                });
            
                labels = correctedClasses; // Each unique class
                dataCounts = Object.values(classCounts); // Number of characters per class
                chartTitle = 'Character Class Distribution';
            }
            

            // Generate chart data
            const data = {
                labels: labels,
                datasets: [{
                    label: 'Number of Characters',
                    data: dataCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                }]
            };

            // Chart configuration
            const config = {
                type: 'bar',
                data: data,
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: chartTitle
                        },
                        beforeDraw: (chart) => {
                            const ctx = chart.ctx;
                            ctx.save();
                            ctx.fillStyle = 'white'; // Set background color to white
                            ctx.fillRect(0, 0, chart.width, chart.height);
                            ctx.restore();
                        }
                    }
                }
            };

            // Render chart and save to file
            const imageBuffer = await chartJSNodeCanvas.renderToBuffer(config);
            const fileName = analyze === 'level' 
                ? (grouping === 'single' ? 'level-distribution-single.png' : 'level-distribution-grouped.png')
                : 'class-distribution.png';
            const imagePath = path.join(__dirname, `../images/${fileName}`);
            fs.writeFileSync(imagePath, imageBuffer);

            // Send the file
            await interaction.editReply({
                content: `The ${analyze === 'level' ? (grouping === 'single' ? 'single level' : 'grouped') : 'class'} distribution chart has been generated.`,
                files: [{
                    attachment: imagePath,
                    name: fileName
                }]
            });

            // Delete the file after sending
            fs.unlinkSync(imagePath);
            console.log(`Deleted file: ${imagePath}`);
        } catch (error) {
            console.error(`Error fetching character data: ${error}`);
            await interaction.editReply({
                content: "An error occurred while fetching the character data.",
                ephemeral: true,
            });
        }
    },
};
