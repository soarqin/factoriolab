import {
  Beacon,
  Belt,
  CargoWagon,
  FluidWagon,
  ModuleEffect,
  Silo,
} from '~/models';
import { EnergyType } from '../../src/app/models';
import * as D from '../factorio-build.models';
import * as M from '../factorio.models';
import { getDisallowedEffects } from './data.helpers';
import { getPowerInKw } from './power.helpers';

export function getBeacon(proto: M.BeaconPrototype): Beacon {
  return {
    effectivity: proto.distribution_effectivity,
    modules: proto.module_specification.module_slots ?? 0,
    range: proto.supply_area_distance,
    type:
      proto.energy_source.type === 'electric' ? EnergyType.Electric : undefined,
    usage: getPowerInKw(proto.energy_usage),
    disallowedEffects: getDisallowedEffects(proto.allowed_effects, true),
  };
}

export function getBelt(proto: M.TransportBeltPrototype): Belt {
  return { speed: proto.speed * 480 };
}

export function getCargoWagon(proto: M.CargoWagonPrototype): CargoWagon {
  return { size: proto.inventory_size };
}

export function getFluidWagon(proto: M.FluidWagonPrototype): FluidWagon {
  return { capacity: proto.capacity };
}

export function getMachineDisallowedEffects(
  proto: D.MachineProto,
): ModuleEffect[] | undefined {
  if (
    M.isBoilerPrototype(proto) ||
    M.isOffshorePumpPrototype(proto) ||
    M.isReactorPrototype(proto)
  )
    return undefined;

  return getDisallowedEffects(proto.allowed_effects);
}

export function getMachineDrain(proto: D.MachineProto): number | undefined {
  if (
    M.isOffshorePumpPrototype(proto) ||
    proto.energy_source.type !== 'electric'
  )
    return undefined;

  if (proto.energy_source.drain != null)
    return getPowerInKw(proto.energy_source.drain);

  if (
    M.isAssemblingMachinePrototype(proto) ||
    M.isRocketSiloPrototype(proto) ||
    M.isFurnacePrototype(proto)
  ) {
    const usage = getMachineUsage(proto);
    if (usage != null) return usage / 30;
  }

  return undefined;
}

export function getMachineModules(proto: D.MachineProto): number | undefined {
  if (
    M.isBoilerPrototype(proto) ||
    M.isOffshorePumpPrototype(proto) ||
    M.isReactorPrototype(proto)
  )
    return undefined;

  return proto.module_specification?.module_slots;
}

export function getMachinePollution(proto: D.MachineProto): number | undefined {
  if (M.isOffshorePumpPrototype(proto)) return undefined;

  return proto.energy_source.emissions_per_minute;
}

export function getMachineSilo(
  proto: D.MachineProto,
  rocketSiloRocket: Record<string, M.RocketSiloRocketPrototype>,
): Silo | undefined {
  if (M.isRocketSiloPrototype(proto)) {
    const rocket = rocketSiloRocket[proto.rocket_entity];

    let launch = 0;
    // Lights blinking open
    launch += 1 / proto.light_blinking_speed + 1;
    // Doors opening
    launch += 1 / proto.door_opening_speed + 1;
    // Doors opened
    launch += (proto.rocket_rising_delay ?? 30) + 1;
    // Rocket rising
    launch += 1 / rocket.rising_speed + 1;
    // Rocket ready
    launch += 14; // Estimate for satellite inserter swing time
    // Launch started
    launch += (proto.launch_wait_time ?? 120) + 1;
    // Engine starting
    launch += 1 / rocket.engine_starting_speed + 1;
    // Rocket flying
    const rocketFlightThreshold = 0.5;
    launch +=
      Math.log(
        1 +
          (rocketFlightThreshold * rocket.flying_acceleration) /
            rocket.flying_speed,
      ) / Math.log(1 + rocket.flying_acceleration);
    // Lights blinking close
    launch += 1 / proto.light_blinking_speed + 1;
    // Doors closing
    launch += 1 / proto.door_opening_speed + 1;

    launch = Math.floor(launch + 0.5);

    return {
      parts: proto.rocket_parts_required,
      launch,
    };
  }

  return undefined;
}

export function getMachineSpeed(proto: D.MachineProto): number {
  if (M.isReactorPrototype(proto)) return 1;

  let speed: number;
  if (M.isBoilerPrototype(proto)) {
    speed = getPowerInKw(proto.energy_consumption) ?? 1;
  } else if (M.isLabPrototype(proto)) {
    speed = proto.researching_speed ?? 1;
  } else if (M.isMiningDrillPrototype(proto)) {
    speed = proto.mining_speed;
  } else if (M.isOffshorePumpPrototype(proto)) {
    speed = 1; // Speed is set on recipe instead of pump
  } else {
    speed = proto.crafting_speed;
  }

  return speed;
}

export function getMachineType(proto: D.MachineProto): EnergyType | undefined {
  if (M.isOffshorePumpPrototype(proto)) return undefined;

  switch (proto.energy_source.type) {
    case 'burner':
    case 'fluid':
      return EnergyType.Burner;
    case 'electric':
      return EnergyType.Electric;
    default:
      return undefined;
  }
}

export function getMachineUsage(proto: D.MachineProto): number | undefined {
  if (M.isOffshorePumpPrototype(proto)) {
    return undefined;
  } else if (M.isBoilerPrototype(proto)) {
    return getPowerInKw(proto.energy_consumption);
  } else if (M.isReactorPrototype(proto)) {
    return getPowerInKw(proto.consumption);
  }

  return getPowerInKw(proto.energy_usage);
}
