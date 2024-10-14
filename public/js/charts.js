
//CHART-1

// Fetch data from the API and update the chart
async function fetchVesselEtsData() {
    try {
      const response = await fetch('/api/vessel-ets'); // Fetch data from API
      const data = await response.json(); // Parse the JSON data
  
      // Prepare data for the chart
      const vesselNames = data.map(vessel => vessel.vessel_name); // Extract vessel names
      const etsValues = data.map(vessel => Math.round(vessel.monthly_ets)); // Round ETS values
  
      // Chart options
      const options = {
        chart: {
          type: 'bar', // Bar chart
          height: 400
        },
        series: [{
          name: 'ETS', // Dataset name
          data: etsValues // Data for the bars
        }],
        xaxis: {
          categories: vesselNames // X-axis labels (vessel names)
        },
        yaxis: {
          labels: {
            formatter: function (value) {
              return Math.round(value); // Round values to remove decimals
            }
          }
        },
        colors: ['#00E396', '#FEB019', '#FF4560', '#775DD0', '#008FFB', '#546E7A', '#D4526E'], // Bar colors
        plotOptions: {
          bar: {
            distributed: true, // Different color for each bar
            borderRadius: 5, // Bar corner radius
            horizontal: false // Vertical bars
          }
        },
        title: {
          text: 'Vessel ETS Data', // Chart title
          align: 'center'
        }
      };
  
      // Render the chart
      const chart = new ApexCharts(document.querySelector("#barChart1"), options);
      chart.render();
    } catch (error) {
      console.error('Error fetching or rendering the chart:', error);
    }
  }
  
  // Call the function when the document is ready
  document.addEventListener('DOMContentLoaded', () => {
    fetchVesselEtsData();
  });
  




//CHART-2

// ApexCharts seçenekleri
async function fetchMonthlyEtsData() {
    try {
      const response = await fetch('/api/monthly-ets'); // Fetch data from API
      const data = await response.json(); // Parse the JSON data
  
      // Prepare data for the chart
      const months = data.map(item => item.month); // Extract months
      const etsValues = data.map(item => item.monthly_ets); // Extract ETS values
  
      // Chart options
      const options = {
        chart: {
          type: 'line', // Line chart
          height: 400
        },
        series: [
          {
            name: 'Monthly ETS', // Data label
            data: etsValues // Data for the chart
          }
        ],
        xaxis: {
          categories: months // X-axis labels (months)
        },
        colors: ['#00E396'], // Line color
        stroke: {
          curve: 'smooth', // Smooth curve
          width: 3 // Line thickness
        },
        markers: {
          size: 5, // Marker size at data points
          colors: ['#00E396'], // Marker color
          strokeColors: '#fff',
          strokeWidth: 2
        },
        title: {
          text: 'Total ETS', // Chart title
          align: 'center'
        },
        grid: {
          row: {
            colors: ['#f3f3f3', 'transparent'], // Striped background rows
            opacity: 0.5
          }
        }
      };
  
      // Render the chart
      const chart = new ApexCharts(document.querySelector("#lineChart1"), options);
      chart.render();
    } catch (error) {
      console.error('Error fetching or rendering the chart:', error);
    }
  }
  
  // Call the function when the document is ready
  document.addEventListener('DOMContentLoaded', () => {
    fetchMonthlyEtsData();
  });









//CHART-3

// ApexCharts seçenekleri
async function fetchMonthlyFuelConsumptionData() {
    try {
      const response = await fetch('/api/monthly-fuel-consumption'); // Fetch data from API
      const data = await response.json(); // Parse the JSON data
  
      // Prepare data for the chart
      const months = data.map(item => item.month); // Extract months
      const fuelTotals = data.map(item => item.fuel_total); // Extract fuel consumption totals
  
      // Chart options
      const options = {
        chart: {
          type: 'bar', // Bar chart
          height: 400
        },
        series: [{
          name: 'Fuel Consumption', // Data label
          data: fuelTotals // Data for the bars
        }],
        xaxis: {
          categories: months // X-axis labels (months)
        },
        colors: ['#008FFB'], // Bar colors
        plotOptions: {
          bar: {
            distributed: true, // Different colors for each bar
            borderRadius: 5, // Bar corner radius
            horizontal: false // Vertical bars
          }
        },
        title: {
          text: 'Monthly Fuel Consumption', // Chart title
          align: 'center'
        }
      };
  
      // Render the chart
      const chart = new ApexCharts(document.querySelector("#barChart2"), options);
      chart.render();
    } catch (error) {
      console.error('Error fetching or rendering the fuel consumption chart:', error);
    }
  }
  
  // Call the function when the document is ready
  document.addEventListener('DOMContentLoaded', () => {
    fetchMonthlyFuelConsumptionData();
  });
//CHART-4

// ApexCharts seçenekleri
async function fetchMonthlyFuelConsumptionByVessel() {
    try {
      const response = await fetch('/api/monthly-fuel-vessels'); // Fetch data from API
      const data = await response.json(); // Parse the JSON data
  
      // Prepare data for the chart
      const vesselNames = [...new Set(data.map(item => item.vessel_name))]; // Extract unique vessel names
      const months = [...new Set(data.map(item => item.month))]; // Extract unique months
      
      // Create a series array for each vessel with their monthly fuel consumption
      const series = vesselNames.map(vessel => {
        return {
          name: vessel, // Name of the vessel
          data: months.map(month => {
            // Find fuel total for each vessel and month
            const vesselMonthData = data.find(d => d.vessel_name === vessel && d.month === month);
            return vesselMonthData ? vesselMonthData.fuel_total : 0; // Return fuel total or 0 if not found
          })
        };
      });
  
      // Chart options
      const options = {
        chart: {
          type: 'line', // Line chart
          height: 400
        },
        series: series, // Data series (multiple lines for each vessel)
        xaxis: {
          categories: months // X-axis labels (months)
        },
        colors: ['#00E396', '#FEB019', '#FF4560', '#775DD0', '#008FFB', '#546E7A', '#D4526E'], // Line colors
        stroke: {
          curve: 'smooth', // Smooth curve
          width: 3 // Line thickness
        },
        markers: {
          size: 5, // Marker size at data points
          strokeColors: '#fff',
          strokeWidth: 2
        },
        title: {
          text: 'Monthly Fuel Consumption by Vessel', // Chart title
          align: 'center'
        },
        grid: {
          row: {
            colors: ['#f3f3f3', 'transparent'], // Striped background rows
            opacity: 0.5
          }
        }
      };
  
      // Render the chart
      const chart = new ApexCharts(document.querySelector("#lineChart2"), options);
      chart.render();
    } catch (error) {
      console.error('Error fetching or rendering the chart:', error);
    }
  }
  
  // Call the function when the document is ready
  document.addEventListener('DOMContentLoaded', () => {
    fetchMonthlyFuelConsumptionByVessel();
  });