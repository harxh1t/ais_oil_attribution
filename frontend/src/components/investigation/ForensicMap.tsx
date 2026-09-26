import React from 'react';
import { BaseMap } from '../maps/BaseMap';
import { useCase } from '../../context/CaseContext';

export const ForensicMap: React.FC = () => {
  const {
    parameters,
    updateParameter,
    pickOnMap,
    runStatus,
    selectedVesselId,
    setSelectedVesselId,
    timeCursor,
    mapLayers,
    toggleLayer,
  } = useCase();

  const isDone = runStatus === 'done' || runStatus === 'completed';

  return (
    <div className="w-full h-full min-h-[500px] lg:min-h-[640px] rounded-[10px] overflow-hidden border border-[var(--border-default)]">
      <BaseMap
        originLat={parameters.lat}
        originLon={parameters.lon}
        spreadKm={parameters.spreadKm}
        pickOnMap={pickOnMap}
        onPickLocation={(lat, lon) => {
          updateParameter('lat', lat);
          updateParameter('lon', lon);
        }}
        isRunDone={isDone}
        selectedVesselId={selectedVesselId}
        onSelectVessel={setSelectedVesselId}
        timeCursor={timeCursor}
        activeLayers={mapLayers}
        onToggleLayer={toggleLayer}
        showControls={true}
      />
    </div>
  );
};
