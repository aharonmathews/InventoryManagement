import pandas as pd
import numpy as np
import gurobipy as gp
from gurobipy import GRB

def solve_production_optimization(data: pd.DataFrame, max_storage: float = 500, initial_inventory: float = 100, max_raw_material: float = 200, initial_raw_material: float = 50, max_production_change: float = 50):
    """
    Solves a production planning optimization problem to maximize profit
    given production costs, storage constraints, and resource availability.

    Args:
        data (pd.DataFrame): DataFrame containing monthly production data.
                           Must include columns: 'Raw_Material_Cost', 'Labour_Cost',
                           'Electricity_Cost', 'Transportation_Cost', 'Commission_Cost',
                           'Warehousing_Cost', 'Revenue', 'Scrap_Metal_Used' and 'Production_Volume'
        max_storage (float): Maximum storage capacity for finished goods.
        initial_inventory (float): Initial inventory level.
        max_raw_material (float): Maximum storage capacity for raw materials (Scrap Metal).
        initial_raw_material (float): Initial raw material inventory.
        max_production_change (float): Maximum change in production volume between months.

    Returns:
        dict: A dictionary containing the optimization results, including:
              - 'objective_value': The optimal profit.
              - 'production_volumes': A dictionary mapping month to the optimal production volume.
              - 'inventory_levels': A dictionary mapping month to the optimal inventory level.
              - 'raw_material_used': A dictionary mapping month to the optimal raw material used.
              - 'raw_material_inventory': A dictionary mapping month to the optimal raw material inventory level
              - 'status': Optimization status (e.g., 'OPTIMAL', 'INFEASIBLE').
    """

    try:
        # Create a Gurobi model
        model = gp.Model("ProductionOptimization")

        # --- Data Preparation ---
        months = data['Month'].tolist()
        num_months = len(months)

        # Extract cost and revenue data from the DataFrame
        raw_material_costs = data['Raw_Material_Cost'].tolist()
        labor_costs = data['Labour_Cost'].tolist()
        electricity_costs = data['Electricity_Cost'].tolist()
        transportation_costs = data['Transportation_Cost'].tolist()
        commission_costs = data['Commission_Cost'].tolist()
        warehousing_costs = data['Warehousing_Cost'].tolist()
        revenues = data['Revenue'].tolist()
        scrap_metal_usage = data['Scrap_Metal_Used'].tolist()

        # --- Decision Variables ---
        production_volume = model.addVars(num_months, vtype=GRB.INTEGER, name="ProductionVolume", lb=0)  # Ensure non-negative production
        inventory_level = model.addVars(num_months, vtype=GRB.CONTINUOUS, name="InventoryLevel", lb=0) #Ensure non-negative inventory
        raw_material_inventory = model.addVars(num_months, vtype=GRB.CONTINUOUS, name="RawMaterialInventory", lb=0)

        # --- Objective Function ---
        # Maximize total profit (Revenue - Costs)
        objective = gp.quicksum(revenues[i] - (raw_material_costs[i] + labor_costs[i] + electricity_costs[i] +
                                                 transportation_costs[i] + commission_costs[i] + warehousing_costs[i])
                                for i in range(num_months))

        model.setObjective(objective, GRB.MAXIMIZE)

        # --- Constraints ---

        # Inventory Balance Constraints
        # Initial Inventory
        model.addConstr(inventory_level[0] == initial_inventory + production_volume[0] - (revenues[0] / data['Revenue'][0] * data['Production_Volume'][0]), name="InventoryBalance_0") # Assuming demand = Revenue/unit_price

        for i in range(1, num_months):
             model.addConstr(inventory_level[i] == inventory_level[i-1] + production_volume[i] - (revenues[i] / data['Revenue'][i] * data['Production_Volume'][i]), name=f"InventoryBalance_{i}")

        # Raw Material Inventory Balance Constraints
        #Initial Raw Material
        model.addConstr(raw_material_inventory[0] == initial_raw_material - scrap_metal_usage[0] , name="RawMaterialBalance_0") #assuming scrap_metal_usage is the raw material use
        for i in range(1,num_months):
            model.addConstr(raw_material_inventory[i] == raw_material_inventory[i-1] - scrap_metal_usage[i] , name=f"RawMaterialBalance_{i}")

        # Storage Capacity Constraints
        for i in range(num_months):
            model.addConstr(inventory_level[i] <= max_storage, name=f"StorageCapacity_{i}")
            model.addConstr(raw_material_inventory[i] <= max_raw_material, name = f"RawMaterialCapacity_{i}")

        # Production Change Constraints (Limit fluctuation in production)
        for i in range(1, num_months):
            model.addConstr(production_volume[i] - production_volume[i-1] <= max_production_change, name=f"ProductionIncrease_{i}")
            model.addConstr(production_volume[i-1] - production_volume[i] <= max_production_change, name=f"ProductionDecrease_{i}")

        # Resource Availability Constraint (Example: total raw material usage)
        # Assuming a budget constraint for total cost over the time horizon.  Using the data, creating a constant
        #model.addConstr(gp.quicksum(raw_material_costs[i] + labor_costs[i] + electricity_costs[i] + transportation_costs[i] + commission_costs[i] + warehousing_costs[i] for i in range(num_months)) <= 1000000, "BudgetConstraint") #10 Lakhs INR



        # --- Solve the Model ---
        model.optimize()

        # --- Extract Results ---
        if model.status == GRB.OPTIMAL:
            production_volumes = {months[i]: production_volume[i].x for i in range(num_months)}
            inventory_levels = {months[i]: inventory_level[i].x for i in range(num_months)}
            raw_material_levels = {months[i]: scrap_metal_usage[i] for i in range(num_months)} #These are the used levels not the inventory
            raw_material_inventory_levels = {months[i]: raw_material_inventory[i].x for i in range(num_months)}

            result_dict = {
                "objective_value": model.objVal,
                "production_volumes": production_volumes,
                "inventory_levels": inventory_levels,
                "raw_material_used": raw_material_levels,
                "raw_material_inventory": raw_material_inventory_levels,
                "status": "OPTIMAL"
            }
        else:
            result_dict = {
                "objective_value": None,
                "production_volumes": None,
                "inventory_levels": None,
                "raw_material_used": None,
                "raw_material_inventory": None,
                "status": "INFEASIBLE" if model.status == GRB.INFEASIBLE else "OTHER"
            }

        return result_dict

    except gp.GurobiError as e:
        print(f"Gurobi error: {e}")
        return {
            "objective_value": None,
            "production_volumes": None,
            "inventory_levels": None,
            "raw_material_used": None,
            "raw_material_inventory": None,
            "status": "ERROR",
            "error_message": str(e)
        }
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {
            "objective_value": None,
            "production_volumes": None,
            "inventory_levels": None,
            "raw_material_used": None,
            "raw_material_inventory": None,
            "status": "ERROR",
            "error_message": str(e)
        }

# Example Usage (Assuming 'data' DataFrame is already loaded)
# result = solve_production_optimization(data)
# print(result)