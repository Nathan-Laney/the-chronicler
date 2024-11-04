const { SlashCommandBuilder } = require("discord.js");
const characterModel = require("../models/characterSchema");
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');

// Set chart width and height
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

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

            // Process character data and generate chart data
            const { labels, dataCounts, chartTitle } = await processCharacterData(characterData, analyze, grouping);

            // Generate chart and save to file
            const imagePath = await generateChartAndSaveToFile(labels, dataCounts, chartTitle);

            // Send the file
            await interaction.editReply({
                content: `The ${analyze === 'level' ? (grouping === 'single' ? 'single level' : 'grouped level') : 'class'} distribution chart has been generated.`,
                files: [{
                    attachment: imagePath,
                    name: path.basename(imagePath)
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

async function processCharacterData(characterData, analyze, grouping) {
    let labels, dataCounts, chartTitle;
    if (analyze === 'level') {
        const levels = characterData.map(char => char.level);
        const minLevel = 3; // D&D characters start at level 3
        const maxLevel = 20; // D&D characters cap at level 20
        if (grouping === 'single') {
            dataCounts = Array(maxLevel - minLevel + 1).fill(0);
            levels.forEach(level => {
                dataCounts[level - minLevel] += 1;
            });
            labels = Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => i + minLevel);
            chartTitle = 'Character Level Distribution (Single Levels)';
        } else {
            const numGroups = Math.ceil((maxLevel - minLevel + 1) / 3);
            dataCounts = Array(numGroups).fill(0);
            levels.forEach(level => {
                const groupIndex = Math.floor((level - minLevel) / 3);
                dataCounts[groupIndex] += 1;
            });
            labels = Array.from({ length: numGroups }, (_, i) => `${minLevel + i * 3}-${minLevel + (i + 1) * 3 - 1}`);
            chartTitle = 'Character Level Distribution (Grouped by Levels)';
        }
    } else if (analyze === 'class') {
        const classes = characterData.map(char => char.class).filter(cls => cls && cls !== 'Not Set');
        const classCounts = {};
        classes.forEach(cls => {
            const titleCaseClass = cls.charAt(0).toUpperCase() + cls.slice(1);
            classCounts[titleCaseClass] = (classCounts[titleCaseClass] || 0) + 1;
        });
        labels = Object.keys(classCounts).sort();
        dataCounts = labels.map(label => classCounts[label]);
        chartTitle = 'Character Class Distribution';
    }
    return { labels, dataCounts, chartTitle };
}

async function generateChartAndSaveToFile(labels, dataCounts, chartTitle) {
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

    const config = {
        type: 'bar',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0 // Display integers only
                    }
                },
                x: {
                    ticks: {
                        autoSkip: false, // Ensure all labels are displayed
                        maxRotation: 90, // Rotate labels to avoid overlap
                        minRotation: 90
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: chartTitle
                }
            }
        },
        plugins: [{
            id: 'background-color',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    };

    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(config);
    const fileName = `${chartTitle.toLowerCase().replace(' ', '-')}.png`;
    const imagesDir = path.join(__dirname, '../images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir);
    }
    const imagePath = path.join(imagesDir, fileName);
    fs.writeFileSync(imagePath, imageBuffer);
    return imagePath;
}