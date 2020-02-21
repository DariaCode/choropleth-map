const educationData = 'https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json';

const countyData = 'https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json';

const w = 950;
const h = 630;

const svg = d3.select(".map").append("svg")
    .attr("width", w)
    .attr("height", h);
// d3.geo.path() helper class for generating SVG Path instructions from GeoJSON data. Then we can pass this SVG Path to the "d" attr of the SVG path to display SVG Path on screen
const path = d3.geoPath();

// CREATION AXISES

//rangeRound() values output by the scale will be rounded to the nearest whole number. This gives shapes exact pixel values (avoids fuzzy edges).
const xScale = d3.scaleLinear()
    .rangeRound([600, 860]);

const colorScale = d3.scaleThreshold()
    .range(d3.schemeGnBu[9]);

const choroplethMap = svg.append("g")
    .classed("chart", true)
    .attr("transform", "translate(10, 10)");

const legendAxis = d3.axisBottom(xScale)
    .tickFormat(d3.format(".0f"))
    .tickSize(15)
    .tickPadding(10)
    .tickSizeOuter(0);

const tooltip = d3.tip()
    .attr("id", "tooltip")
    .html(d => d)
    .direction("s")
    .offset([22, 0]); //vertical tooltip offset

function chart(args) {
    let match;
    let minBachelor = d3.min(args.dataEduc.map(d => d.bachelorsOrHigher));
    let maxBachelor = d3.max(args.dataEduc.map(d => d.bachelorsOrHigher));

    xScale.domain([minBachelor, maxBachelor]);
    colorScale.domain(d3.range(minBachelor, maxBachelor, (maxBachelor - minBachelor) / 8));
    legendAxis.tickValues(colorScale.domain());

    // LEGEND 

    let legend = this.append("g")
        .attr("id", "legend")
        .classed("legend", true)
        .attr("transform", "translate(0,5)");

    legend.selectAll("rect")
        .data(colorScale.range().map(d => {
            //invertExtent() returns the extent of values in the domain [x0, x1] for the corresponding value in. The range, representing the inverse mapping from range to domain.
            d = colorScale.invertExtent(d);
            if (d[0] == null) d[0] = xScale.domain()[0];
            if (d[1] == null) d[1] = xScale.domain()[1];
            return d;
        }))
        .enter()
        .append("rect")
        .attr("height", 15)
        .attr("x", d => xScale(d[0]))
        .attr("y", 5)
        .attr("width", d => xScale(d[1]) - xScale(d[0]))
        .attr("fill", d => colorScale(d[0]))
    //d = [color1, color2] => d[0], d[1] for each segment or "rect" in colorScale. For each "d" which is an array of 2 colors, use color.invertExtent(d) to get the corresponding 

    legend.append("g")
        .classed("legendAxis", true)
        .attr("transform", "translate(0,5)")
        .call(args.axis);

    //Invoke tip in context of visualization (i.e. choroplethMap)
    this.call(tooltip)

    let counties = topojson.feature(args.dataMap, args.dataMap.objects.counties).features;

    //Map counties
    this.append("g")
        .classed("counties", true)
        .selectAll("path")
        .data(counties)
        .enter()
        .append("path")
        .classed("county", true)
        .attr("data-fips", d => d.id)
        //Link 2 data sources via id (fips). filter() returns an array with a singular match (i.e. hence match[0])
        .attr("data-education", d => {
            match = args.dataEduc.filter(item => item.fips == d.id);
            return match[0] ? match[0].bachelorsOrHigher : 0;
        })
        .attr("fill", d => {
            match = args.dataEduc.filter(item => item.fips == d.id);
            return match[0] ? colorScale(match[0].bachelorsOrHigher) : colorScale(0);
        })
        .attr("d", path) //d attribute displays data that has been converted to SVG path instructions by d3.geoPath() (variable path)
        .on("mouseover", function (d, i) {
            match = args.dataEduc.filter(item => item.fips == d.id);
            let matchHtml = `<p>${match[0].area_name}, ${match[0].state}:<span class="d3TipTextHilight">${match[0].bachelorsOrHigher}%</span></p>`;
            let html = match[0] ? matchHtml : 0;

            tooltip.attr("data-education", match[0] ? match[0].bachelorsOrHigher : 0);

            tooltip.show(html);

            d3.select(this).style("fill", "#9D4F9E") //highlight county on hover
                .classed("hover-county", true);
        })
        .on("mouseout", function (d, i) {
            tooltip.hide()

            d3.select(this).style("fill", d => {
                    match = args.dataEduc.filter(item => item.fips == d.id);
                    return match[0] ? colorScale(match[0].bachelorsOrHigher) : colorScale(0);
                })
                .classed("hover-county", false)
        })

    let states = topojson.feature(args.dataMap, args.dataMap.objects.states);

    //states boundaries
    this.append("path")
        .datum(states)
        .classed("states", true)
        .attr("d", path);
}

//Use queue to handle asynchronous functions with callbacks
d3.queue()
    .defer(d3.json, countyData)
    .defer(d3.json, educationData)
    .await(handleMap);

function handleMap(error, jsonMap, jsonEduc) {
    if (error) throw error;

    chart.call(choroplethMap, {
        //params to pass to plot()
        dataMap: jsonMap,
        dataEduc: jsonEduc,
        axis: legendAxis
    })
}