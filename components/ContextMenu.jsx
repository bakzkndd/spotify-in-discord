import React, { memo, useState } from 'react';
import { clipboard, shell } from 'electron';
import { debounce } from 'lodash';

import { Flux, getModule, messages, channels, contextMenu } from '@vizality/webpack';
import { ContextMenu, Tooltip } from '@vizality/components';
import { Messages } from '@vizality/i18n';

import playerStore from '../stores/player/store';
import SpotifyAPI from '../SpotifyAPI';

const { closeContextMenu } = contextMenu;

const Menu = memo(props => {
  const { playerState, currentTrack } = props;
  const [ , setVol ] = useState({});
  const advertisement = Boolean(playerState?.currentlyPlayingType === 'ad');

  const setVolume = volume => {
    SpotifyAPI.setVolume(Math.round(volume));
  };

  const handleVolumeSlide = volume => {
    const vol = debounce(() => setVolume(volume), 300);

    setVol(prevVol => {
      if (prevVol.cancel) {
        prevVol.cancel();
      }

      return vol;
    });

    vol(volume);
  };

  const renderPlaybackSettings = () => {
    const cannotAll = !playerState?.canRepeat && !playerState?.canRepeatOne;
    const isOff = playerState?.repeat === playerStore?.RepeatState?.NO_REPEAT;
    const isContext = playerState?.repeat === playerStore?.RepeatState?.REPEAT_CONTEXT;
    const isTrack = playerState?.repeat === playerStore?.RepeatState?.REPEAT_TRACK;

    return (
      <ContextMenu.Group>
        <ContextMenu.Item id='repeat' label='Repeat Mode' disabled={cannotAll}>
          <ContextMenu.RadioItem
            id={`off${isOff ? '-active' : ''}`}
            group='repeat'
            label='No Repeat'
            checked={isOff}
            action={() => SpotifyAPI.setRepeatState('off')}
          />
          <ContextMenu.RadioItem
            id={`context${isContext ? '-active' : ''}`}
            group='repeat'
            label='Repeat'
            checked={isContext}
            action={() => SpotifyAPI.setRepeatState('context')}
          />
          <ContextMenu.RadioItem
            id={`track${isTrack ? '-active' : ''}`}
            group='repeat'
            label='Repeat Track'
            checked={isTrack}
            action={() => SpotifyAPI.setRepeatState('track')}
          />
        </ContextMenu.Item>
        <ContextMenu.CheckboxItem
          id='shuffle'
          label='Shuffle'
          checked={playerState?.shuffle}
          action={() => SpotifyAPI.setShuffleState(!playerState?.shuffle)}
          disabled={!playerState?.canShuffle}
        />
      </ContextMenu.Group>
    );
  };

  const renderVolume = () => {
    const Slider = getModule(m => m?.render?.toString()?.includes('sliderContainer'));
    return (
      <ContextMenu.Group>
        <ContextMenu.ControlItem
          id='volume'
          label='Volume'
          control={(props, ref) => (
            <Slider
              mini
              ref={ref}
              value={playerState?.volume}
              onChange={handleVolumeSlide}
              {...props}
            />
          )}
        />
      </ContextMenu.Group>
    );
  };

  const Pie = () => (
    <Tooltip text='Due to inactivity or logging into a different account, you may need to reload the plugin.' color={Tooltip.Colors.GREEN}>
        Reload Plugin
    </Tooltip>
  );

  const renderActions = () => {
    return (
      <>
        <ContextMenu.Group>
          <ContextMenu.Item
            id='open-spotify'
            label='Open in Spotify'
            disabled={advertisement}
            action={() => {
              const protocol = getModule('isProtocolRegistered', '_dispatchToken').isProtocolRegistered();
              shell.openExternal(protocol ? currentTrack?.uri : currentTrack?.urls?.track);
            }}
          />
          <ContextMenu.Item
            id='send-album'
            disabled={advertisement || !currentTrack?.urls?.album}
            label='Send Album to Channel'
            action={() => messages.sendMessage(
              channels.getChannelId(),
              { content: currentTrack?.urls?.album }
            )}
          />
          <ContextMenu.Item
            id='send-song'
            label='Send Song to Channel'
            disabled={advertisement}
            action={() => messages.sendMessage(
              channels.getChannelId(),
              { content: currentTrack?.urls?.track }
            )}
          />
          <ContextMenu.Separator/>
          <ContextMenu.Item
            id='copy-album'
            disabled={advertisement || !currentTrack?.urls?.album}
            label='Copy Album URL'
            action={() => clipboard.writeText(currentTrack?.urls?.album)}
          />
          <ContextMenu.Item
            id='copy-song'
            label='Copy Song URL'
            disabled={advertisement}
            action={() => clipboard.writeText(currentTrack?.urls?.track)}
          />
        </ContextMenu.Group>
        <ContextMenu.Separator />
        <ContextMenu.Item
          id='reload-player'
          label={() => Pie()}
          action={async () => vizality.manager.plugins.reload('spotify-in-discord')}
        />
      </>
    );
  };

  return (
    <ContextMenu.Menu navId='spotify-in-discord-menu' onClose={closeContextMenu}>
      {renderPlaybackSettings()}
      {renderVolume()}
      {renderActions()}
    </ContextMenu.Menu>
  );
});

export default Flux.connectStores(
  [ playerStore, vizality.api.settings.store ],
  props => ({
    ...playerStore.getStore(),
    ...vizality.api.settings._fluxProps(props.addonId)
  })
)(Menu);
