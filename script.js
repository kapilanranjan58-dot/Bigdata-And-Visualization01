// Configuration
const margin = { top: 30, right: 30, bottom: 50, left: 60 };

// Color palette
const colors = {
    primary: '#667eea',
    secondary: '#764ba2',
    accent1: '#f093fb',
    accent2: '#4facfe',
    accent3: '#43e97b',
    accent4: '#fa709a',
    categories: ['#667eea', '#f093fb', '#4facfe']
};

// Tooltip
const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

// Load and process data
d3.csv("cleanedSuperstoreSalesDataset.csv").then(data => {
    // Parse data
    data.forEach(d => {
        d.sales = +d.sales;
        d.order_date = new Date(d.order_date);
    });

    // Update statistics
    updateStats(data);

    // Draw visualizations
    drawHistogram(data);
    drawScatterPlot(data);
    drawTimeSeries(data);
});

// Update statistics cards
function updateStats(data) {
    const totalSales = d3.sum(data, d => d.sales);
    const totalOrders = data.length;
    const avgSales = d3.mean(data, d => d.sales);
    const maxSales = d3.max(data, d => d.sales);

    d3.select('#total-sales').text('$' + formatNumber(totalSales));
    d3.select('#total-orders').text(formatNumber(totalOrders));
    d3.select('#avg-sales').text('$' + formatNumber(avgSales));
    d3.select('#max-sales').text('$' + formatNumber(maxSales));

    // Animate numbers
    animateValue('total-sales', 0, totalSales, 1500, true);
    animateValue('total-orders', 0, totalOrders, 1500, false);
    animateValue('avg-sales', 0, avgSales, 1500, true);
    animateValue('max-sales', 0, maxSales, 1500, true);
}

// Number formatting
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
}

// Animate counter
function animateValue(id, start, end, duration, isCurrency) {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        const prefix = isCurrency ? '$' : '';
        element.textContent = prefix + formatNumber(current);
    }, 16);
}

// ==================== HISTOGRAM ====================
function drawHistogram(data) {
    const container = d3.select('#histogram').node().parentNode;
    const width = container.clientWidth;
    const height = 350;

    const svg = d3.select('#histogram')
        .attr('width', width)
        .attr('height', height);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create bins
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.sales)])
        .range([0, chartWidth]);

    const bins = d3.bin()
        .domain(x.domain())
        .thresholds(30)
        (data.map(d => d.sales));

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([chartHeight, 0]);

    // Add grid
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth)
            .tickFormat(''));

    // Draw bars
    g.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0) + 1)
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 2))
        .attr('y', chartHeight)
        .attr('height', 0)
        .attr('fill', colors.primary)
        .attr('rx', 4)
        .on('mouseover', function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('fill', colors.accent2);

            tooltip
                .style('opacity', 1)
                .html(`
                    <strong>Range:</strong> $${formatNumber(d.x0)} - $${formatNumber(d.x1)}<br>
                    <strong>Count:</strong> ${d.length} orders
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('fill', colors.primary);

            tooltip.style('opacity', 0);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 20)
        .attr('y', d => y(d.length))
        .attr('height', d => chartHeight - y(d.length));

    // Add axes
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d => '$' + formatNumber(d)));

    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y));

    // Add labels
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#4a5568')
        .text('Sales Amount ($)');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#4a5568')
        .text('Frequency');
}

// ==================== SCATTER PLOT ====================
function drawScatterPlot(data) {
    const container = d3.select('#scatter').node().parentNode;
    const width = container.clientWidth;
    const height = 350;

    const svg = d3.select('#scatter')
        .attr('width', width)
        .attr('height', height);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Get unique categories
    const categories = [...new Set(data.map(d => d.category))];
    const colorScale = d3.scaleOrdinal()
        .domain(categories)
        .range(colors.categories);

    // Scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.sales)])
        .range([0, chartWidth]);

    // Create a jittered y position based on category
    const categoryScale = d3.scaleBand()
        .domain(categories)
        .range([chartHeight, 0])
        .padding(0.3);

    // Add grid
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(categoryScale)
            .tickSize(-chartWidth)
            .tickFormat(''));

    // Draw points
    g.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.sales))
        .attr('cy', d => categoryScale(d.category) + categoryScale.bandwidth() / 2 + (Math.random() - 0.5) * categoryScale.bandwidth() * 0.8)
        .attr('r', 0)
        .attr('fill', d => colorScale(d.category))
        .attr('opacity', 0.6)
        .on('mouseover', function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 6)
                .attr('opacity', 1);

            tooltip
                .style('opacity', 1)
                .html(`
                    <strong>Category:</strong> ${d.category}<br>
                    <strong>Sales:</strong> $${formatNumber(d.sales)}<br>
                    <strong>Product:</strong> ${d.product_name}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 4)
                .attr('opacity', 0.6);

            tooltip.style('opacity', 0);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 2)
        .attr('r', 4);

    // Add axes
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d => '$' + formatNumber(d)));

    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(categoryScale));

    // Add labels
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#4a5568')
        .text('Sales Amount ($)');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#4a5568')
        .text('Category');

    // Add legend
    const legend = g.append('g')
        .attr('transform', `translate(${chartWidth - 100}, 0)`);

    categories.forEach((cat, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('circle')
            .attr('r', 5)
            .attr('fill', colorScale(cat))
            .attr('opacity', 0.6);

        legendRow.append('text')
            .attr('x', 10)
            .attr('y', 4)
            .style('font-size', '11px')
            .style('fill', '#4a5568')
            .text(cat);
    });
}

// ==================== TIME SERIES ====================
function drawTimeSeries(data) {
    const container = d3.select('#timeseries').node().parentNode;
    const width = container.clientWidth;
    const height = 400;

    const svg = d3.select('#timeseries')
        .attr('width', width)
        .attr('height', height);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.order_date))
        .range([0, chartWidth]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.sales)])
        .range([chartHeight, 0]);

    // Add grid
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth)
            .tickFormat(''));

    // Draw points
    g.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.order_date))
        .attr('cy', d => y(d.sales))
        .attr('r', 0)
        .attr('fill', colors.accent3)
        .attr('opacity', 0.5)
        .on('mouseover', function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 6)
                .attr('opacity', 1);

            tooltip
                .style('opacity', 1)
                .html(`
                    <strong>Date:</strong> ${d.order_date.toLocaleDateString()}<br>
                    <strong>Sales:</strong> $${formatNumber(d.sales)}<br>
                    <strong>Customer:</strong> ${d.customer_name}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 3)
                .attr('opacity', 0.5);

            tooltip.style('opacity', 0);
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 1)
        .attr('r', 3);

    // Add axes
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).ticks(10));

    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(8).tickFormat(d => '$' + formatNumber(d)));

    // Add labels
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#4a5568')
        .text('Order Date');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#4a5568')
        .text('Sales Amount ($)');
}

// Handle window resize
window.addEventListener('resize', () => {
    d3.select('#histogram').selectAll('*').remove();
    d3.select('#scatter').selectAll('*').remove();
    d3.select('#timeseries').selectAll('*').remove();

    d3.csv("cleanedSuperstoreSalesDataset.csv").then(data => {
        data.forEach(d => {
            d.sales = +d.sales;
            d.order_date = new Date(d.order_date);
        });

        drawHistogram(data);
        drawScatterPlot(data);
        drawTimeSeries(data);
    });
});
